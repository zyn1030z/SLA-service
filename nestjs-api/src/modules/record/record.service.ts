import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { SystemEntity } from "../../entities/system.entity";
import { ActivityEntity } from "../../entities/activity.entity";

export interface ListRecordsQuery {
  page?: number;
  pageSize?: number;
  status?: "waiting" | "violated" | "completed";
  search?: string;
  model?: string;
  workflowId?: number;
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
    private activityRepository: Repository<ActivityEntity>
  ) {}

  private isPositiveInt(value: unknown): boolean {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
  }

  async create(payload: CreateRecordDto): Promise<RecordEntity> {
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
    const workflowName = payload.workflowName ?? workflow.workflowName ?? null;

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

        // Tạo Date object theo UTC để tránh timezone conversion
        // Sử dụng Date.UTC() để tạo UTC timestamp
        startTime = new Date(
          Date.UTC(year, month - 1, day, hours, minutes, seconds || 0)
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

    // Calculate initial violation count and remaining hours
    let violationCount = 0;
    let remainingHours = slaHours;

    if (activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });
      if (activity) {
        const now = new Date();
        // Cộng thêm 7 giờ vào now (điều chỉnh timezone UTC+7)
        const nowWithOffset = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const elapsedHours =
          (nowWithOffset.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        const maxViolations = activity.maxViolations || 3;

        // Calculate violations: each slaHours period is one violation
        // Đảm bảo violationCount không bao giờ âm
        violationCount = Math.max(
          0,
          Math.min(Math.floor(elapsedHours / slaHours), maxViolations)
        );
        // Tính remainingHours: SLA hours - số giờ đã trôi qua
        // Lưu số thập phân để có thể hiển thị giờ:phút:giây chính xác
        remainingHours = Math.max(0, slaHours - elapsedHours);
      }
    }

    // Làm tròn đến 2 chữ số thập phân (để lưu vào numeric column)
    const remainingHoursDecimal = Math.round(remainingHours * 100) / 100;

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

    return savedRecord;
  }

  async list(query: ListRecordsQuery) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));

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
      const s = `%${query.search}%`;
      qb.andWhere(
        "(r.record_id ILIKE :s OR r.workflow_name ILIKE :s OR r.step_name ILIKE :s)",
        { s }
      );
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
