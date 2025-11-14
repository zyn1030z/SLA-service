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
  private readonly BUSINESS_START_HOUR = 8; // 8h
  private readonly BUSINESS_END_HOUR = 17; // 17h
  private readonly BUSINESS_HOURS_PER_DAY = 9; // 17 - 8 = 9 giờ

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
   * Lấy thời gian hiện tại với timezone UTC+7
   */
  private getNowWithOffset(): Date {
    const now = new Date();
    return new Date(now.getTime() + 7 * 60 * 60 * 1000);
  }

  /**
   * Kiểm tra xem thời gian có nằm trong giờ hành chính (8h-17h) không
   */
  private isBusinessHours(date: Date): boolean {
    const hour = date.getUTCHours();
    return hour >= this.BUSINESS_START_HOUR && hour < this.BUSINESS_END_HOUR;
  }

  /**
   * Đưa thời gian về đầu giờ hành chính gần nhất (8h sáng)
   * Nếu đã qua 17h, đưa về 8h sáng ngày hôm sau
   */
  private normalizeToBusinessStart(date: Date): Date {
    const normalized = new Date(date);
    const hour = normalized.getUTCHours();

    if (hour < this.BUSINESS_START_HOUR) {
      // Trước 8h sáng, đưa về 8h sáng cùng ngày
      normalized.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
    } else if (hour >= this.BUSINESS_END_HOUR) {
      // Sau 17h, đưa về 8h sáng ngày hôm sau
      normalized.setUTCDate(normalized.getUTCDate() + 1);
      normalized.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
    } else {
      // Trong giờ hành chính, giữ nguyên giờ nhưng reset phút/giây
      normalized.setUTCMinutes(0, 0, 0);
    }

    return normalized;
  }

  /**
   * Tính số giờ hành chính giữa hai thời điểm
   */
  public calculateBusinessHoursBetween(start: Date, end: Date): number {
    if (end <= start) {
      return 0;
    }

    let current = new Date(start);
    let totalHours = 0;

    // Nếu start nằm ngoài giờ hành chính, đưa về đầu giờ hành chính gần nhất
    if (!this.isBusinessHours(start)) {
      const hour = current.getUTCHours();
      if (hour < this.BUSINESS_START_HOUR) {
        // Trước 8h sáng, đưa về 8h sáng cùng ngày
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      } else if (hour >= this.BUSINESS_END_HOUR) {
        // Sau 17h, đưa về 8h sáng ngày hôm sau
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      }
    }

    while (current < end) {
      // Tính thời điểm kết thúc giờ hành chính trong ngày hiện tại
      const currentDay = new Date(current);
      currentDay.setUTCHours(0, 0, 0, 0);
      const endOfBusinessDay = new Date(currentDay);
      endOfBusinessDay.setUTCHours(this.BUSINESS_END_HOUR, 0, 0, 0);

      if (end <= endOfBusinessDay) {
        // End nằm trong cùng ngày, tính số giờ còn lại
        const hoursInDay = Math.max(
          0,
          end.getUTCHours() - current.getUTCHours()
        );
        const minutesInDay =
          (end.getUTCMinutes() - current.getUTCMinutes()) / 60;
        totalHours += Math.max(0, hoursInDay + minutesInDay);
        break;
      } else {
        // Tính số giờ từ current đến 17h cùng ngày
        const hoursToEndOfDay = Math.max(
          0,
          this.BUSINESS_END_HOUR - current.getUTCHours()
        );
        const minutesToEndOfDay = (60 - current.getUTCMinutes()) / 60;
        totalHours += hoursToEndOfDay + minutesToEndOfDay;

        // Chuyển sang 8h sáng ngày hôm sau
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      }
    }

    return totalHours;
  }

  /**
   * Tính thời điểm đến hạn tiếp theo dựa trên startTime và số giờ SLA
   * Nếu thời gian đẩy lên trong khung 8h-17h mà chưa đủ thời gian SLA,
   * thì tính đến 17h + thời gian SLA từ 8h sáng hôm sau
   */
  public calculateNextDueAt(
    startTime: Date,
    slaHours: number,
    violationCount: number = 0
  ): Date {
    let current: Date;
    let remainingSlaHours = slaHours * (violationCount + 1);

    // Nếu startTime nằm trong giờ hành chính, kiểm tra xem có đủ thời gian không
    if (this.isBusinessHours(startTime)) {
      // Tính thời điểm kết thúc giờ hành chính trong ngày
      const startDay = new Date(startTime);
      startDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(startDay);
      endOfDay.setUTCHours(this.BUSINESS_END_HOUR, 0, 0, 0);

      const hoursUntilEndOfDay =
        (endOfDay.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEndOfDay < remainingSlaHours) {
        // Không đủ thời gian trong ngày, tính đến 17h + thời gian từ 8h sáng hôm sau
        remainingSlaHours -= hoursUntilEndOfDay;
        // Chuyển sang 8h sáng ngày hôm sau
        current = new Date(endOfDay);
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      } else {
        // Đủ thời gian trong ngày, bắt đầu từ startTime
        current = new Date(startTime);
      }
    } else {
      // StartTime nằm ngoài giờ hành chính, đưa về đầu giờ hành chính gần nhất
      current = this.normalizeToBusinessStart(startTime);
    }

    // Tính thời điểm đến hạn bằng cách cộng dần số giờ hành chính còn lại
    while (remainingSlaHours > 0) {
      const hoursInCurrentDay = Math.min(
        remainingSlaHours,
        this.BUSINESS_END_HOUR - current.getUTCHours()
      );

      current.setUTCHours(current.getUTCHours() + hoursInCurrentDay);
      remainingSlaHours -= hoursInCurrentDay;

      if (remainingSlaHours > 0) {
        // Chưa hết SLA, chuyển sang 8h sáng ngày hôm sau
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      }
    }

    return current;
  }

  /**
   * Tính toán số lần vi phạm SLA cho một record (theo giờ hành chính)
   */
  calculateViolations(record: RecordEntity, activity: ActivityEntity): number {
    if (!record.startTime || record.status === "completed") {
      return record.violationCount || 0;
    }

    const nowWithOffset = this.getNowWithOffset();
    const startTime = new Date(record.startTime);
    const slaHours = activity.slaHours || record.slaHours || 24;
    const maxViolations = activity.maxViolations || 3;

    // Tính số giờ hành chính đã trôi qua từ startTime đến now
    const elapsedBusinessHours = this.calculateBusinessHoursBetween(
      startTime,
      nowWithOffset
    );

    // Tính số lần vi phạm: mỗi slaHours là 1 lần vi phạm
    // Đảm bảo violations không bao giờ âm
    const violations = Math.max(0, Math.floor(elapsedBusinessHours / slaHours));

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
    const slaHours = activity.slaHours || record.slaHours || 24;

    // update realtime
    record.remainingHours = this.calculateRemainingHours(record, activity);
    if (record.startTime && record.slaHours) {
      record.nextDueAt = this.calculateNextDueAt(
        record.startTime,
        slaHours,
        newViolationCount
      );
    }

    // Chỉ cập nhật nếu số lần vi phạm thay đổi
    if (newViolationCount > oldViolationCount) {
      record.violationCount = newViolationCount;

      record.remainingHours = this.calculateRemainingHours(record, activity);

      // update nextDueAt dựa trên violationCount mới
      if (record.startTime && record.slaHours) {
        record.nextDueAt = this.calculateNextDueAt(
          record.startTime,
          slaHours,
          newViolationCount
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
        record.nextDueAt = this.calculateNextDueAt(
          record.startTime,
          slaHours,
          newViolationCount
        );
      }
      await this.recordRepository.save(record);
    }
  }

  /**
   * Tính số giờ còn lại (theo giờ hành chính)
   */
  private calculateRemainingHours(
    record: RecordEntity,
    activity: ActivityEntity
  ): number {
    if (!record.startTime) {
      return 0;
    }

    const nowWithOffset = this.getNowWithOffset();
    const slaHours = activity.slaHours || record.slaHours || 24;

    // Tính nextDueAt dựa trên giờ hành chính
    const nextDueAt = this.calculateNextDueAt(
      record.startTime,
      slaHours,
      record.violationCount || 0
    );

    // Tính số giờ hành chính còn lại từ now đến nextDueAt
    const remaining = this.calculateBusinessHoursBetween(
      nowWithOffset,
      nextDueAt
    );

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
