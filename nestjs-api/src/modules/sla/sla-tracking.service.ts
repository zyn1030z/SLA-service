import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { OdooService } from "../odoo/odoo.service";
import { SlaActionLogEntity } from "../../entities/sla-action-log.entity";

export interface ListActionLogsQuery {
  page?: number;
  pageSize?: number;
  actionType?: "notify" | "auto_approve";
  search?: string;
}

@Injectable()
export class SlaTrackingService {
  private readonly logger = new Logger(SlaTrackingService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    @InjectRepository(SlaActionLogEntity)
    private slaActionLogRepository: Repository<SlaActionLogEntity>,
    private odooService: OdooService
  ) {}

  /**
   * Tính toán số lần vi phạm SLA cho một record
   */
  calculateViolations(record: RecordEntity, activity: ActivityEntity): number {
    if (!record.startTime || record.status === "completed") {
      return record.violationCount || 0;
    }

    const now = new Date();
    // Cộng thêm 7 giờ vào now (điều chỉnh timezone UTC+7)
    const nowWithOffset = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const startTime = new Date(record.startTime);
    const elapsedHours =
      (nowWithOffset.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const slaHours = activity.slaHours || record.slaHours || 24;
    const maxViolations = activity.maxViolations || 3;

    // Tính số lần vi phạm: mỗi slaHours là 1 lần vi phạm
    // Đảm bảo violations không bao giờ âm
    const violations = Math.max(0, Math.floor(elapsedHours / slaHours));

    // Giới hạn số lần vi phạm tối đa
    return Math.min(violations, maxViolations);
  }

  /**
   * Kiểm tra và cập nhật vi phạm SLA cho một record
   */
  async checkAndUpdateViolations(record: RecordEntity): Promise<void> {
    if (record.status === "completed") {
      return;
    }

    // Lấy activity nếu có
    let activity: ActivityEntity | null = null;
    if (record.activityId) {
      activity = await this.activityRepository.findOne({
        where: { id: record.activityId },
      });
    }

    // Nếu không có activity, tìm theo stepCode và workflowId
    if (!activity && record.stepCode && record.workflowId) {
      activity = await this.activityRepository.findOne({
        where: {
          workflowId: record.workflowId,
          code: record.stepCode,
        },
      });
    }

    if (!activity) {
      this.logger.warn(
        `Activity not found for record ${record.recordId}, stepCode: ${record.stepCode}`
      );
      return;
    }

    const oldViolationCount = record.violationCount || 0;
    const newViolationCount = this.calculateViolations(record, activity);
    // const newViolationCount = 3;

    // update realtime
    record.remainingHours = this.calculateRemainingHours(record, activity);
    if (record.startTime && record.slaHours) {
      record.nextDueAt = new Date(
        record.startTime.getTime() +
          record.slaHours * (newViolationCount + 1) * 60 * 60 * 1000
      );
    }

    // Chỉ cập nhật nếu số lần vi phạm thay đổi
    if (newViolationCount > oldViolationCount) {
      record.violationCount = newViolationCount;

      record.remainingHours = this.calculateRemainingHours(record, activity);

      // update nextDueAt dựa trên violationCount mới
      if (record.startTime && record.slaHours) {
        record.nextDueAt = new Date(
          record.startTime.getTime() +
            record.slaHours * (newViolationCount + 1) * 60 * 60 * 1000
        );
      }

      // Cập nhật status nếu vi phạm
      if (newViolationCount > 0 && record.status === "waiting") {
        record.status = "violated";
      }

      await this.recordRepository.save(record);

      // Xử lý hành động vi phạm
      await this.handleViolationAction(
        record,
        activity,
        oldViolationCount,
        newViolationCount
      );

      this.logger.log(
        `Updated violations for record ${record.recordId}: ${oldViolationCount} -> ${newViolationCount}`
      );
    } else {
      if (record.startTime && record.slaHours) {
        record.nextDueAt = new Date(
          record.startTime.getTime() +
            record.slaHours * (newViolationCount + 1) * 60 * 60 * 1000
        );
      }
      await this.recordRepository.save(record);
    }
  }

  /**
   * Tính số giờ còn lại
   */
  private calculateRemainingHours(
    record: RecordEntity,
    activity: ActivityEntity
  ): number {
    if (!record.startTime) {
      return 0;
    }

    const now = new Date();
    // Cộng thêm 7 giờ vào now (điều chỉnh timezone UTC+7)
    const nowWithOffset = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const nextDueAt = new Date(
      record.startTime.getTime() +
        record.slaHours * (record.violationCount + 1) * 60 * 60 * 1000
    );
    const startTime = new Date(record.startTime);
    const elapsedHours =
      (nextDueAt.getTime() - nowWithOffset.getTime()) / (1000 * 60 * 60);

    const slaHours = activity.slaHours || record.slaHours || 24;
    // const remaining = slaHours - elapsedHours;
    const remaining = elapsedHours;

    // Làm tròn đến 2 chữ số thập phân (để lưu vào numeric column)
    // Nếu âm quá nhiều, giới hạn ở -999 để tránh overflow
    return Math.max(-999, Math.round(remaining * 100) / 100);
  }

  /**
   * Xử lý hành động khi vi phạm SLA
   */
  private async handleViolationAction(
    record: RecordEntity,
    activity: ActivityEntity,
    oldViolationCount: number,
    newViolationCount: number
  ): Promise<void> {
    // Chỉ xử lý khi có vi phạm mới
    if (newViolationCount <= oldViolationCount) {
      return;
    }

    const violationAction = activity.violationAction || "notify";

    if (violationAction === "notify") {
      const success = await this.odooService.sendNotification(record, activity);
      await this.saveActionLog({
        record,
        activity,
        actionType: "notify",
        violationCount: newViolationCount,
        isSuccess: success,
        message: success
          ? null
          : "Notification API not configured or request failed",
      });
    } else if (violationAction === "auto_approve") {
      const threshold = activity.maxViolations || 3;
      if (newViolationCount >= threshold) {
        const success = await this.odooService.sendAutoApproval(
          record,
          activity,
          newViolationCount
        );
        await this.saveActionLog({
          record,
          activity,
          actionType: "auto_approve",
          violationCount: newViolationCount,
          isSuccess: success,
          message: success
            ? null
            : "Auto-approval API not configured or request failed",
        });
      } else {
        // Chưa đạt ngưỡng vi phạm để tự động phê duyệt
        await this.saveActionLog({
          record,
          activity,
          actionType: "auto_approve",
          violationCount: newViolationCount,
          isSuccess: false,
          message: `Auto-approval skipped: violationCount ${newViolationCount} < threshold ${threshold}`,
        });
      }
    }
  }

  private async saveActionLog(params: {
    record: RecordEntity;
    activity: ActivityEntity | null;
    actionType: "notify" | "auto_approve";
    violationCount: number;
    isSuccess: boolean;
    message?: string | null;
  }): Promise<void> {
    const { record, activity, actionType, violationCount, isSuccess, message } =
      params;

    try {
      const log = this.slaActionLogRepository.create({
        recordId: record.recordId,
        workflowId: record.workflowId ?? null,
        activityId: activity?.id ?? null,
        actionType,
        violationCount,
        isSuccess,
        message: message ?? null,
      });
      await this.slaActionLogRepository.save(log);
    } catch (error) {
      this.logger.error(
        `Failed to save SLA action log for record ${record.recordId}`,
        error
      );
    }
  }

  /**
   * Kiểm tra tất cả records đang chờ
   */
  async checkAllWaitingRecords(): Promise<void> {
    const waitingRecords = await this.recordRepository.find({
      where: {
        status: "waiting",
      },
    });

    this.logger.log(`Checking ${waitingRecords.length} waiting records`);

    for (const record of waitingRecords) {
      try {
        await this.checkAndUpdateViolations(record);
      } catch (error) {
        this.logger.error(
          `Error checking violations for record ${record.recordId}:`,
          error
        );
      }
    }
  }

  /**
   * Kiểm tra records vi phạm
   */
  async checkViolatedRecords(): Promise<void> {
    const violatedRecords = await this.recordRepository.find({
      where: {
        status: "violated",
      },
    });

    this.logger.log(`Checking ${violatedRecords.length} violated records`);

    for (const record of violatedRecords) {
      try {
        await this.checkAndUpdateViolations(record);
      } catch (error) {
        this.logger.error(
          `Error checking violations for record ${record.recordId}:`,
          error
        );
      }
    }
  }

  /**
   * Lấy số lượng records đang chờ
   */
  async getWaitingRecordsCount(): Promise<number> {
    return this.recordRepository.count({
      where: {
        status: "waiting",
      },
    });
  }

  /**
   * Lấy số lượng records đã vi phạm
   */
  async getViolatedRecordsCount(): Promise<number> {
    return this.recordRepository.count({
      where: {
        status: "violated",
      },
    });
  }

  /**
   * Danh sách log hành động SLA
   */
  async listActionLogs(query: ListActionLogsQuery) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));

    const qb = this.slaActionLogRepository
      .createQueryBuilder("log")
      .orderBy("log.created_at", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (query.actionType) {
      qb.andWhere("log.action_type = :actionType", {
        actionType: query.actionType,
      });
    }

    if (query.search) {
      const search = `%${query.search}%`;
      qb.andWhere(
        `(log.record_id ILIKE :search
          OR COALESCE(log.message, '') ILIKE :search
          OR log.action_type ILIKE :search
          OR CAST(log.workflow_id AS TEXT) ILIKE :search
          OR CAST(log.activity_id AS TEXT) ILIKE :search
          OR CAST(log.violation_count AS TEXT) ILIKE :search
          OR CAST(log.is_success AS TEXT) ILIKE :search)`,
        { search }
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
