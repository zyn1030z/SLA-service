import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { SystemEntity } from "../../entities/system.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { SlaTrackingService } from "../sla/sla-tracking.service";

export interface ListRecordsQuery {
  page?: number;
  pageSize?: number;
  status?: "waiting" | "violated" | "completed";
  step?: string;
  search?: string;
  model?: string;
  workflowId?: number;
  assignee?: string;
  userId?: number;
  days?: number;
}

export interface CreateRecordDto {
  recordId: string;
  model: string;
  odooWorkflowId?: number | null; // New: use this to find workflowId and systemId
  systemId?: number | null; // Optional: can be derived from odooWorkflowId
  workflowId?: number | null; // Optional: can be derived from odooWorkflowId
  workflowName?: string | null;
  stepCode?: string | null;
  stepName?: string | null;
  activityId?: number | null;
  startTime?: string | Date | null;
  status?: "waiting" | "violated" | "completed";
  violationCount?: number;
  slaHours?: number;
  remainingHours?: number;
  userApprove?: Array<{
    id: number;
    name: string;
    login: string;
  }>;
}

export interface CreateRecordResult {
  record: RecordEntity;
  isExisting: boolean;
}

export interface UpdateRecordDto extends Partial<CreateRecordDto> {
  user_approve?: Array<{
    id: number;
    name: string;
    login: string;
  }> | null;
}

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(SystemEntity)
    private systemRepository: Repository<SystemEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    private slaTrackingService: SlaTrackingService
  ) {}

  private isPositiveInt(value: unknown): boolean {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
  }

  async create(payload: CreateRecordDto): Promise<CreateRecordResult> {
    // Hỗ trợ cả camelCase và snake_case cho user_approve
    const anyPayload = payload as any;
    const incomingUserApprove =
      payload.userApprove ?? anyPayload.user_approve ?? null;

    let systemId: number;
    let workflowId: number;
    let workflow: WorkflowEntity | null = null;

    // Priority: If odooWorkflowId is provided, use it to find workflow
    if (payload.odooWorkflowId) {
      if (!this.isPositiveInt(payload.odooWorkflowId)) {
        throw new BadRequestException(
          `odooWorkflowId must be a positive integer. Received: ${payload.odooWorkflowId}`
        );
      }

      workflow = await this.workflowRepository.findOne({
        where: { odooWorkflowId: payload.odooWorkflowId },
      });

      if (!workflow) {
        throw new BadRequestException(
          `Workflow not found for odooWorkflowId=${payload.odooWorkflowId}`
        );
      }

      workflowId = workflow.id;
      systemId = workflow.systemId;
    } else {
      // Fallback: Use provided workflowId and systemId (backward compatibility)
      if (!payload.systemId) {
        throw new BadRequestException(
          "Either odooWorkflowId or systemId is required"
        );
      }
      if (!payload.workflowId) {
        throw new BadRequestException(
          "Either odooWorkflowId or workflowId is required"
        );
      }

      if (!this.isPositiveInt(payload.systemId)) {
        throw new BadRequestException(
          `systemId must be a positive integer. Received: ${payload.systemId}`
        );
      }
      if (!this.isPositiveInt(payload.workflowId)) {
        throw new BadRequestException(
          `workflowId must be a positive integer. Received: ${payload.workflowId}`
        );
      }

      systemId = payload.systemId;
      workflowId = payload.workflowId;

      // Validate existence in database
      const [system, foundWorkflow] = await Promise.all([
        this.systemRepository.findOne({ where: { id: systemId } }),
        this.workflowRepository.findOne({ where: { id: workflowId } }),
      ]);

      if (!system) {
        throw new BadRequestException(
          `System not found for systemId=${systemId}`
        );
      }
      if (!foundWorkflow) {
        throw new BadRequestException(
          `Workflow not found for workflowId=${workflowId}`
        );
      }

      workflow = foundWorkflow;
    }

    // Use workflowName from workflow if not provided
    const workflowName = payload.workflowName ?? workflow?.workflowName ?? null;

    // Find activity from stepCode if provided
    let activityId: number | null = null;
    let stepName: string | null = payload.stepName ?? null;

    if (payload.stepCode) {
      const activity = await this.activityRepository.findOne({
        where: {
          workflowId: workflowId,
          code: payload.stepCode,
        },
      });

      if (activity) {
        activityId = activity.id;
        // Use activity name if stepName not provided
        if (!stepName) {
          stepName = activity.name;
        }
      } else {
        // Activity not found, but we still allow creating record with stepCode
        // This is optional, so we don't throw error
      }
    }

    // Check for existing record to prevent duplicates
    // A record is considered duplicate if it has the same:
    // - recordId, model, systemId, workflowId, activityId, userApprove
    const existingRecords = await this.recordRepository
      .createQueryBuilder("record")
      .where("record.record_id = :recordId", { recordId: payload.recordId })
      .andWhere("record.model = :model", { model: payload.model })
      .andWhere("record.system_id = :systemId", { systemId })
      .andWhere("record.workflow_id = :workflowId", { workflowId })
      .andWhere("record.activity_id IS NOT DISTINCT FROM :activityId", { activityId })
      .getMany();

    // Since we already filtered by systemId, workflowId, and activityId,
    // now we just need to check if userApprove is the same
    const isDuplicate = existingRecords.some(record => {
      // Compare userApprove arrays (considering null/undefined as equivalent)
      const existingUserApprove = record.userApprove;
      const incomingUserApproveNormalized = incomingUserApprove;

      // Both null/undefined → duplicate
      if (!existingUserApprove && !incomingUserApproveNormalized) {
        return true;
      }

      // One is null/undefined, other is not → not duplicate
      if (!existingUserApprove || !incomingUserApproveNormalized) {
        return false;
      }

      // Both are arrays, compare content
      if (Array.isArray(existingUserApprove) && Array.isArray(incomingUserApproveNormalized)) {
        if (existingUserApprove.length !== incomingUserApproveNormalized.length) {
          return false;
        }

        // Sort both arrays by user id and compare
        const sortedExisting = [...existingUserApprove].sort((a, b) => a.id - b.id);
        const sortedIncoming = [...incomingUserApproveNormalized].sort((a, b) => a.id - b.id);

        return sortedExisting.every((user, index) =>
          user.id === sortedIncoming[index]?.id &&
          user.login === sortedIncoming[index]?.login
        );
      }

      return false;
    });

    if (isDuplicate) {
      // Return existing record instead of throwing error
      return {
        record: existingRecords[0],
        isExisting: true
      };
    }

    // Determine SLA hours: use from activity, then payload, then default
    let slaHours = payload.slaHours ?? 24;
    if (activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });
      if (activity?.slaHours) {
        slaHours = activity.slaHours;
      }
    }

    // Parse startTime - hỗ trợ nhiều format
    let startTime: Date;
    if (payload.startTime) {
      const timeStr = String(payload.startTime).trim();
      // Nếu format là "YYYY-MM-DD HH:mm:ss", parse thủ công để tránh timezone issues
      if (timeStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Parse "2025-11-12 14:42:12" thành Date object
        // Tách các phần: YYYY-MM-DD và HH:mm:ss
        const [datePart, timePart] = timeStr.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split(":").map(Number);

        // Tạo Date object theo UTC, nhưng trừ đi 7 giờ vì input là giờ Việt Nam (UTC+7)
        // Ví dụ: 15:40 VN -> 08:40 UTC
        startTime = new Date(
          Date.UTC(year, month - 1, day, hours - 7, minutes, seconds || 0)
        );

        // Kiểm tra nếu parse sai (Invalid Date)
        if (isNaN(startTime.getTime())) {
          console.warn(
            `Invalid startTime format: ${timeStr}, using current time`
          );
          startTime = new Date();
        }
      } else {
        startTime = new Date(payload.startTime);
        // Kiểm tra nếu parse sai
        if (isNaN(startTime.getTime())) {
          console.warn(
            `Invalid startTime: ${payload.startTime}, using current time`
          );
          startTime = new Date();
        }
      }
    } else {
      startTime = new Date();
    }

    // Calculate initial violation count and remaining hours (theo giờ hành chính)
    let violationCount = 0;
    let remainingHours = slaHours;

    if (activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });
      if (activity) {
        // Tính số lần vi phạm theo giờ hành chính
        const tempRecord: Partial<RecordEntity> = {
          startTime,
          slaHours,
          status: "waiting",
          violationCount: 0,
        };
        violationCount = this.slaTrackingService.calculateViolations(
          tempRecord as RecordEntity,
          activity
        );

        // Tính nextDueAt theo giờ hành chính
        const nextDueAt = this.slaTrackingService.calculateNextDueAt(
          startTime,
          slaHours,
          violationCount
        );

        // Tính remainingHours: số giờ hành chính còn lại từ now đến nextDueAt
        const now = new Date();
        const nowWithOffset = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        remainingHours = this.slaTrackingService.calculateBusinessHoursBetween(
          nowWithOffset,
          nextDueAt
        );
        remainingHours = Math.max(0, remainingHours);
      }
    }

    // Làm tròn đến 2 chữ số thập phân (để lưu vào numeric column)
    const remainingHoursDecimal = Math.round(remainingHours * 100) / 100;

    // Tính nextDueAt theo giờ hành chính
    const nextDueAt = this.slaTrackingService.calculateNextDueAt(
      startTime,
      slaHours,
      violationCount
    );

    const entity = this.recordRepository.create({
      recordId: payload.recordId,
      model: payload.model,
      systemId,
      workflowId,
      workflowName,
      activityId,
      stepCode: payload.stepCode ?? null,
      stepName,
      startTime,
      status: violationCount > 0 ? "violated" : payload.status ?? "waiting",
      violationCount: payload.violationCount ?? violationCount,
      slaHours,
      remainingHours: payload.remainingHours ?? remainingHoursDecimal,
      userApprove: incomingUserApprove ?? null,
      nextDueAt,
    });

    const savedRecord = await this.recordRepository.save(entity);

    // If there are violations, handle the action immediately
    if (violationCount > 0 && activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });
      if (activity) {
        // Import and use OdooService to handle violation action
        // Note: This creates a circular dependency, so we'll handle it in cron job instead
        // The cron job will check and handle violations periodically
      }
    }

    return {
      record: savedRecord,
      isExisting: false
    };
  }

  async update(id: number, payload: UpdateRecordDto): Promise<RecordEntity> {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Record with id=${id} not found`);
    }

    const anyPayload = payload as any;
    const incomingUserApprove = payload.userApprove ?? anyPayload.user_approve;

    // Update workflow/system if provided
    let workflow: WorkflowEntity | null = null;
    if (payload.odooWorkflowId) {
      if (!this.isPositiveInt(payload.odooWorkflowId)) {
        throw new BadRequestException(
          `odooWorkflowId must be a positive integer. Received: ${payload.odooWorkflowId}`
        );
      }
      workflow = await this.workflowRepository.findOne({
        where: { odooWorkflowId: payload.odooWorkflowId },
      });
      if (!workflow) {
        throw new BadRequestException(
          `Workflow not found for odooWorkflowId=${payload.odooWorkflowId}`
        );
      }
      record.workflowId = workflow.id;
      record.systemId = workflow.systemId;
      record.workflowName =
        payload.workflowName ?? workflow.workflowName ?? record.workflowName;
    } else if (payload.workflowId && payload.systemId) {
      if (!this.isPositiveInt(payload.workflowId)) {
        throw new BadRequestException(
          `workflowId must be a positive integer. Received: ${payload.workflowId}`
        );
      }
      if (!this.isPositiveInt(payload.systemId)) {
        throw new BadRequestException(
          `systemId must be a positive integer. Received: ${payload.systemId}`
        );
      }
      const [system, foundWorkflow] = await Promise.all([
        this.systemRepository.findOne({ where: { id: payload.systemId } }),
        this.workflowRepository.findOne({ where: { id: payload.workflowId } }),
      ]);
      if (!system) {
        throw new BadRequestException(
          `System not found for systemId=${payload.systemId}`
        );
      }
      if (!foundWorkflow) {
        throw new BadRequestException(
          `Workflow not found for workflowId=${payload.workflowId}`
        );
      }
      workflow = foundWorkflow;
      record.systemId = payload.systemId;
      record.workflowId = payload.workflowId;
      record.workflowName =
        payload.workflowName ?? workflow?.workflowName ?? record.workflowName;
    } else if (payload.workflowName) {
      record.workflowName = payload.workflowName;
    }

    if (payload.recordId) record.recordId = payload.recordId;
    if (payload.model) record.model = payload.model;
    if (payload.stepCode !== undefined)
      record.stepCode = payload.stepCode ?? null;
    if (payload.stepName !== undefined)
      record.stepName = payload.stepName ?? null;

    if (payload.stepCode && record.workflowId) {
      const activity = await this.activityRepository.findOne({
        where: { workflowId: record.workflowId, code: payload.stepCode },
      });
      if (activity) {
        record.activityId = activity.id;
        if (!payload.stepName) {
          record.stepName = activity.name;
        }
      }
    }

    if (payload.activityId !== undefined) {
      record.activityId = payload.activityId;
    }

    if (payload.startTime) {
      const timeStr = String(payload.startTime).trim();
      let startTime: Date;
      if (timeStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        const [datePart, timePart] = timeStr.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split(":").map(Number);
        // Trừ 7 giờ để convert từ VN Local Time sang UTC
        startTime = new Date(
          Date.UTC(year, month - 1, day, hours - 7, minutes, seconds || 0)
        );
      } else {
        startTime = new Date(payload.startTime);
      }
      if (isNaN(startTime.getTime())) {
        throw new BadRequestException(
          `Invalid startTime: ${payload.startTime}`
        );
      }
      record.startTime = startTime;
    }

    if (payload.status) record.status = payload.status;
    if (payload.violationCount !== undefined)
      record.violationCount = payload.violationCount;

    const startTimeChanged = payload.startTime !== undefined;
    const slaHoursChanged = payload.slaHours !== undefined;

    if (payload.slaHours !== undefined) record.slaHours = payload.slaHours;
    if (payload.remainingHours !== undefined)
      record.remainingHours = payload.remainingHours;

    // Tự động tính lại nextDueAt nếu startTime hoặc slaHours thay đổi (theo giờ hành chính)
    if (startTimeChanged || slaHoursChanged) {
      const currentStartTime = record.startTime;
      const currentSlaHours = record.slaHours;
      if (currentStartTime && currentSlaHours) {
        record.nextDueAt = this.slaTrackingService.calculateNextDueAt(
          currentStartTime,
          currentSlaHours,
          record.violationCount || 0
        );
      }
    }
    // Nếu payload truyền status là "completed", cập nhật ngày phê duyệt (approvedAt) là ngày hiện tại (UTC)
    if (payload.status && payload.status === "completed") {
      record.approvedAt = new Date(); // UTC time
    }

    if (incomingUserApprove !== undefined) {
      record.userApprove = incomingUserApprove ?? null;
    }

    const savedRecord = await this.recordRepository.save(record);
    return savedRecord;
  }

  async list(query: ListRecordsQuery) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 30)));

    const where: FindOptionsWhere<RecordEntity> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.model) {
      where.model = query.model;
    }
    if (query.workflowId) {
      where.workflowId = query.workflowId;
    }
    if (query.search) {
      // Search over recordId, workflowName, stepName
      Object.assign(where, {
        // Using ILike for case-insensitive contains
        // We fake OR by running separate query builder below for better control
      });
    }

    const qb = this.recordRepository
      .createQueryBuilder("r")
      .orderBy("r.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (where.status)
      qb.andWhere("r.status = :status", { status: where.status });
    if (where.model) qb.andWhere("r.model = :model", { model: where.model });
    if (where.workflowId)
      qb.andWhere("r.workflow_id = :workflowId", {
        workflowId: where.workflowId,
      });
    if (query.search) {
      // Perform case-insensitive contains search across many columns by casting
      // columns to text and using ILIKE with wildcards. This avoids full-text
      // search but still lets users search all table columns.
      const s = `%${query.search}%`;
      const cols = [
        "record_id",
        "model",
        "workflow_name",
        "step_code",
        "step_name",
        "status",
        "violation_count",
        "sla_hours",
        "remaining_hours",
        "user_approve",
        "approved_at",
        "next_due_at",
        "created_at",
        "updated_at"
      ];

      const conditions = cols
        .map((c) => `COALESCE(CAST(r.${c} AS TEXT), '') ILIKE :s`)
        .join(" OR ");

      // Also search inside the user_approve JSONB array for name/login values
      const jsonbApproverCondition =
        "EXISTS (SELECT 1 FROM jsonb_array_elements(r.user_approve) elem WHERE (elem->>'name') ILIKE :s OR (elem->>'login') ILIKE :s)";

      qb.andWhere(`(${conditions} OR ${jsonbApproverCondition})`, { s });
    }
    if (query.userId) {
      // Filter by user ID in the userApprove JSONB array
      // userApprove is [{"id": 1, "name": "...", "login": "..."}]
      qb.andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(r.user_approve) elem WHERE (elem->>'id')::int = :userId)",
        { userId: query.userId }
      );
    }
    // Backward compatibility for 'assignee' (login)
    if (query.assignee) {
      qb.andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(r.user_approve) elem WHERE (elem->>'login') = :assignee)",
        { assignee: query.assignee }
      );
    }
    if (query.days) {
      // Filter by created_at in the last N days
      qb.andWhere("r.created_at >= NOW() - make_interval(days := :days)", {
        days: query.days,
      });
    }
    if (query.step) {
      qb.andWhere("r.step_name = :step", { step: query.step });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
