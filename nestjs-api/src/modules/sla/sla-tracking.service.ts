import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { OdooService } from "../odoo/odoo.service";
import { SlaActionLogEntity } from "../../entities/sla-action-log.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";

export interface ListActionLogsQuery {
  page?: number;
  pageSize?: number;
  actionType?: "notify" | "auto_approve";
  search?: string;
}

@Injectable()
export class SlaTrackingService {
  private readonly logger = new Logger(SlaTrackingService.name);
  private readonly BUSINESS_TIMEZONE_OFFSET = 7; // UTC+7
  private readonly BUSINESS_START_HOUR = 8; // 8h business time (15h UTC)
  private readonly BUSINESS_END_HOUR = 17; // 17h business time (24h UTC / 00h next day UTC)
  private readonly BUSINESS_HOURS_PER_DAY = 9; // 17 - 8 = 9 giờ

  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    @InjectRepository(SlaActionLogEntity)
    private slaActionLogRepository: Repository<SlaActionLogEntity>,
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    private odooService: OdooService
  ) {}

  /**
   * Lấy thời gian hiện tại (UTC)
   */
  private getNow(): Date {
    return new Date(); // UTC time
  }

  /**
   * Convert UTC time to business timezone (UTC+7)
   */
  private toBusinessTimezone(utcDate: Date): Date {
    return new Date(utcDate.getTime() + this.BUSINESS_TIMEZONE_OFFSET * 60 * 60 * 1000);
  }

  /**
   * Convert business timezone time to UTC
   */
  private fromBusinessTimezone(businessDate: Date): Date {
    return new Date(businessDate.getTime() - this.BUSINESS_TIMEZONE_OFFSET * 60 * 60 * 1000);
  }

  /**
   * Kiểm tra xem có phải ngày làm việc (thứ 2 - thứ 6) không
   * @deprecated Sử dụng isValidBusinessDay thay thế
   */
  private isBusinessDay(date: Date): boolean {
    const day = date.getUTCDay(); // 0: Chủ nhật, 6: Thứ bảy
    return day >= 1 && day <= 5;
  }

  /**
   * Di chuyển đến 8h sáng của ngày làm việc tiếp theo (thứ 2-6 hoặc thứ 7 sáng)
   */
  private moveToNextBusinessDay(date: Date): Date {
    const next = new Date(date);
    do {
      next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
    } while (!this.isValidBusinessDay(next));
    return next;
  }

  /**
   * Kiểm tra xem thời gian có nằm trong giờ hành chính không
   * - Thứ 2-6: 8h-17h
   * - Thứ 7: 8h-12h
   */
  private isBusinessHours(date: Date): boolean {
    if (!this.isValidBusinessDay(date)) {
      return false;
    }
    const businessDate = this.toBusinessTimezone(date);
    const hour = businessDate.getUTCHours();
    const businessEndHour = this.getBusinessEndHourForDay(businessDate);
    return hour >= this.BUSINESS_START_HOUR && hour < businessEndHour;
  }

  /**
   * Đưa thời gian về đầu giờ hành chính gần nhất (8h sáng)
   * - Thứ 2-6: 8h-17h
   * - Thứ 7: 8h-12h
   * - Chủ nhật: chuyển sang thứ 2
   */
  private normalizeToBusinessStart(date: Date): Date {
    let normalized = new Date(date);
    const hour = normalized.getUTCHours();
    const day = normalized.getUTCDay();
    const businessEndHour = this.getBusinessEndHourForDay(normalized);

    // Nếu là chủ nhật hoặc thứ 7 từ 12h trở đi, chuyển sang thứ 2
    if (day === 0 || (day === 6 && hour >= 12)) {
      normalized = this.moveToNextBusinessDay(normalized);
      return normalized;
    }

    if (hour < this.BUSINESS_START_HOUR) {
      // Trước 8h sáng, đưa về 8h sáng cùng ngày
      normalized.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
    } else if (hour >= businessEndHour) {
      // Sau giờ kết thúc (17h cho thứ 2-6, 12h cho thứ 7), chuyển sang ngày làm việc tiếp theo
      normalized = this.moveToNextBusinessDay(normalized);
      return normalized;
    } else {
      // Trong giờ hành chính, giữ nguyên giờ nhưng reset phút/giây
      normalized.setUTCMinutes(0, 0, 0);
    }

    if (!this.isValidBusinessDay(normalized)) {
      normalized = this.moveToNextBusinessDay(normalized);
    }

    return normalized;
  }

  /**
   * Kiểm tra xem ngày có phải là ngày làm việc hợp lệ không (theo business timezone UTC+7)
   * - Thứ 2 đến thứ 6: hợp lệ
   * - Thứ 7: chỉ hợp lệ nếu < 12h (business time)
   * - Chủ nhật: không hợp lệ
   */
  private isValidBusinessDay(date: Date): boolean {
    // Convert UTC date to business timezone for checking
    const businessDate = this.toBusinessTimezone(date);
    const day = businessDate.getUTCDay(); // 0: Chủ nhật, 6: Thứ bảy
    const hour = businessDate.getUTCHours();

    // Thứ 2-6: hợp lệ
    if (day >= 1 && day <= 5) {
      return true;
    }

    // Thứ 7: chỉ hợp lệ nếu < 12h (business time)
    if (day === 6) {
      return hour < 12;
    }

    // Chủ nhật: không hợp lệ
    return false;
  }

  /**
   * Lấy giờ kết thúc giờ hành chính cho một ngày
   * - Thứ 2-6: 17h
   * - Thứ 7: 12h
   * - Chủ nhật: 0 (không tính)
   */
  private getBusinessEndHourForDay(date: Date): number {
    const day = date.getUTCDay();
    if (day === 6) {
      // Thứ 7: kết thúc lúc 12h
      return 12;
    }
    // Thứ 2-6: kết thúc lúc 17h
    return this.BUSINESS_END_HOUR;
  }

  /**
   * Tính số giờ hành chính giữa hai thời điểm
   *
   * Chỉ tính các khoảng thời gian nằm trong giờ hành chính từ 08:00 đến 17:00 (thứ 2-6)
   * hoặc từ 08:00 đến 12:00 (thứ 7 sáng).
   * Không tính thời gian ngoài khung giờ hành chính.
   * Nếu start hoặc end nằm ngoài giờ hành chính thì chỉ tính phần giao với giờ hành chính.
   * Chỉ tính từ thứ 2 đến sáng thứ 7 (trước 12h), không tính thứ 7 từ 12h trở đi và chủ nhật.
   *
   * @param start - Thời điểm bắt đầu
   * @param end - Thời điểm kết thúc
   * @returns Tổng số giờ hành chính (có thể là số thập phân)
   */
  public calculateBusinessHoursBetween(start: Date, end: Date): number {
    // Kiểm tra điều kiện cơ bản
    if (end <= start) {
      return 0;
    }

    // Lấy thông tin ngày của start và end
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Kiểm tra nếu start hoặc end không phải ngày làm việc hợp lệ
    if (
      !this.isValidBusinessDay(startDate) &&
      !this.isValidBusinessDay(endDate)
    ) {
      // Nếu cả hai đều không hợp lệ, kiểm tra xem có ngày hợp lệ nào ở giữa không
      const startDay = new Date(startDate);
      startDay.setUTCHours(0, 0, 0, 0);
      const endDay = new Date(endDate);
      endDay.setUTCHours(0, 0, 0, 0);

      // Nếu cùng ngày và cả hai đều không hợp lệ, return 0
      if (startDay.getTime() === endDay.getTime()) {
        return 0;
      }
    }

    let totalHours = 0;
    let current = new Date(startDate);

    // Duyệt qua từng ngày từ start đến end
    while (current < endDate) {
      const currentDay = new Date(current);
      currentDay.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(currentDay);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      // Kiểm tra xem ngày hiện tại có phải ngày làm việc hợp lệ không
      if (!this.isValidBusinessDay(current)) {
        // Nếu không hợp lệ, chuyển sang ngày tiếp theo
        current = nextDay;
        current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
        continue;
      }

      const dayOfWeek = current.getUTCDay();
      const businessEndHour = this.getBusinessEndHourForDay(current);

      // Xác định thời điểm bắt đầu tính trong ngày
      let dayStartHour = current.getUTCHours();
      let dayStartMinute = current.getUTCMinutes();

      // Nếu đây là ngày đầu tiên và start < 8h, bắt đầu từ 8h
      if (
        current.getTime() === startDate.getTime() &&
        dayStartHour < this.BUSINESS_START_HOUR
      ) {
        dayStartHour = this.BUSINESS_START_HOUR;
        dayStartMinute = 0;
      }

      // Xác định thời điểm kết thúc tính trong ngày
      let dayEndHour: number;
      let dayEndMinute: number;

      // Kiểm tra xem end có nằm trong cùng ngày không
      const endDay = new Date(endDate);
      endDay.setUTCHours(0, 0, 0, 0);
      const isLastDay = currentDay.getTime() === endDay.getTime();

      if (isLastDay) {
        // Cùng ngày: tính đến end (nhưng không vượt quá businessEndHour)
        dayEndHour = endDate.getUTCHours();
        dayEndMinute = endDate.getUTCMinutes();

        // Giới hạn không vượt quá businessEndHour
        if (
          dayEndHour > businessEndHour ||
          (dayEndHour === businessEndHour && dayEndMinute > 0)
        ) {
          dayEndHour = businessEndHour;
          dayEndMinute = 0;
        }

        // Nếu end < 8h, không tính
        if (dayEndHour < this.BUSINESS_START_HOUR) {
          break;
        }
      } else {
        // Không phải ngày cuối: tính đến businessEndHour
        dayEndHour = businessEndHour;
        dayEndMinute = 0;
      }

      // Tính số giờ trong ngày (chỉ tính nếu dayStart < dayEnd)
      if (
        dayStartHour < dayEndHour ||
        (dayStartHour === dayEndHour && dayStartMinute < dayEndMinute)
      ) {
        const startTimeMinutes = dayStartHour * 60 + dayStartMinute;
        const endTimeMinutes = dayEndHour * 60 + dayEndMinute;
        const hoursInDay = (endTimeMinutes - startTimeMinutes) / 60;
        totalHours += hoursInDay;
      }

      // Chuyển sang ngày tiếp theo
      current = nextDay;
      current.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
    }

    // Làm tròn đến 2 chữ số thập phân để tránh lỗi floating point
    return Math.round(totalHours * 100) / 100;
  }

  /**
   * Tính thời điểm đến hạn tiếp theo dựa trên startTime và số giờ SLA
   *
   * Tính theo giờ hành chính:
   * - Thứ 2-6: 8h-17h
   * - Thứ 7 sáng: 8h-12h
   * - Không tính thứ 7 từ 12h trở đi và chủ nhật
   *
   * Nếu thời gian đẩy lên trong khung giờ hành chính mà chưa đủ thời gian SLA,
   * thì tính đến giờ kết thúc của ngày + thời gian từ 8h sáng ngày làm việc tiếp theo
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
      const businessEndHour = this.getBusinessEndHourForDay(startTime);
      endOfDay.setUTCHours(businessEndHour, 0, 0, 0);

      const hoursUntilEndOfDay =
        (endOfDay.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEndOfDay < remainingSlaHours) {
        // Không đủ thời gian trong ngày, tính đến giờ kết thúc + thời gian từ 8h sáng hôm sau
        remainingSlaHours -= hoursUntilEndOfDay;
        // Chuyển sang 8h sáng ngày làm việc kế tiếp
        current = this.moveToNextBusinessDay(endOfDay);
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
      // Lấy giờ kết thúc của ngày hiện tại
      const businessEndHour = this.getBusinessEndHourForDay(current);
      const currentHour = current.getUTCHours();

      // Tính số giờ có thể dùng trong ngày hiện tại
      const hoursInCurrentDay = Math.min(
        remainingSlaHours,
        businessEndHour - currentHour
      );

      // Cộng số giờ vào thời điểm hiện tại
      current.setUTCHours(current.getUTCHours() + hoursInCurrentDay);
      remainingSlaHours -= hoursInCurrentDay;

      if (remainingSlaHours > 0) {
        // Chưa hết SLA, chuyển sang 8h sáng ngày làm việc kế tiếp
        current = this.moveToNextBusinessDay(current);
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

    const now = this.getNow();
    const startTime = new Date(record.startTime);
    const slaHours = activity.slaHours || record.slaHours || 24;
    const maxViolations = activity.maxViolations || 3;

    // Tính số giờ hành chính đã trôi qua từ startTime đến now
    const elapsedBusinessHours = this.calculateBusinessHoursBetween(
      startTime,
      now
    );

    // Tính số lần vi phạm: mỗi slaHours là 1 lần vi phạm
    // Đảm bảo violations không bao giờ âm
    // const elapsedBusinessHours = 29;
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
    // tính toán số lần vi phạm mới dựa trên thời gian đã trôi qua
    const newViolationCount = this.calculateViolations(record, activity);
    const slaHours = activity.slaHours || record.slaHours || 24;

    // update realtime
    record.remainingHours = this.calculateRemainingHours(record, activity);
    if (record.startTime && record.slaHours) {
      if (record.violationCount === activity.maxViolations) {
        record.nextDueAt = null;
      } else {
        record.nextDueAt = this.calculateNextDueAt(
          record.startTime,
          slaHours,
          newViolationCount
        );
      }
    }

    // Chỉ cập nhật nếu số lần vi phạm thay đổi
    if (newViolationCount != oldViolationCount) {
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
        if (record.violationCount === activity.maxViolations) {
          record.nextDueAt = null;
        } else {
          record.nextDueAt = this.calculateNextDueAt(
            record.startTime,
            slaHours,
            newViolationCount
          );
        }
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

    const now = this.getNow();
    const slaHours = activity.slaHours || record.slaHours || 24;

    // Tính nextDueAt dựa trên giờ hành chính
    const nextDueAt = this.calculateNextDueAt(
      record.startTime,
      slaHours,
      record.violationCount || 0
    );

    // Tính số giờ hành chính còn lại từ now đến nextDueAt
    const remaining = this.calculateBusinessHoursBetween(
      now,
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
            : "Gửi thông báo vi phạm: API không được cấu hình hoặc yêu cầu thất bại",
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
            : "Tự động phê duyệt: API không được cấu hình hoặc yêu cầu thất bại",
        });
      } else {
        // Chưa đạt ngưỡng vi phạm để tự động phê duyệt
        await this.saveActionLog({
          record,
          activity,
          actionType: "auto_approve",
          violationCount: newViolationCount,
          isSuccess: false,
          message: `Bỏ qua tự động phê duyệt: số lần vi phạm ${newViolationCount} < ngưỡng ${threshold}`,
        });
        // Với mỗi lần quá hạn vẫn gửi notification như trường hợp 'notify'
        const success = await this.odooService.sendNotification(
          record,
          activity
        );
        await this.saveActionLog({
          record,
          activity,
          actionType: "notify",
          violationCount: newViolationCount,
          isSuccess: success,
          message: success
            ? null
            : "Gửi thông báo vi phạm: API không được cấu hình hoặc yêu cầu thất bại",
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
      .leftJoin(WorkflowEntity, "workflow", "workflow.id = log.workflowId")
      .leftJoin(ActivityEntity, "activity", "activity.id = log.activityId")
      .leftJoin(RecordEntity, "record", "record.recordId = log.recordId")
      .orderBy("log.createdAt", "DESC")
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
          OR CAST(log.is_success AS TEXT) ILIKE :search
          OR workflow.workflowName ILIKE :search
          OR activity.name ILIKE :search
          OR CAST(record.userApprove AS TEXT) ILIKE :search)`,
        { search }
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const workflowIds = Array.from(
      new Set(
        items
          .map((log: SlaActionLogEntity) => log.workflowId)
          .filter((id: number | null): id is number => typeof id === "number")
      )
    );

    let workflowNameMap = new Map<number, string>();

    if (workflowIds.length > 0) {
      const workflows = await this.workflowRepository.find({
        where: { id: In(workflowIds) },
        select: ["id", "workflowName"],
      });
      workflowNameMap = new Map(
        workflows.map((workflow: WorkflowEntity) => [
          workflow.id,
          workflow.workflowName,
        ])
      );
    }

    const itemsWithWorkflowName = items.map((log: SlaActionLogEntity) => ({
      ...log,
      workflowName:
        typeof log.workflowId === "number"
          ? workflowNameMap.get(log.workflowId) ?? null
          : null,
    }));

    const activityIds = Array.from(
      new Set(
        items
          .map((log: SlaActionLogEntity) => log.activityId)
          .filter((id: number | null): id is number => typeof id === "number")
      )
    );
    let activityNameMap = new Map<number, string>();
    if (activityIds.length > 0) {
      const activities = await this.activityRepository.find({
        where: { id: In(activityIds) },
        select: ["id", "name"],
      });
      activityNameMap = new Map(
        activities.map((activity: ActivityEntity) => [
          activity.id,
          activity.name,
        ])
      );
    }

    const itemsWithActivityName = itemsWithWorkflowName.map(
      (item: SlaActionLogEntity & { workflowName: string | null }) => ({
        ...item,
        activityName:
          typeof item.activityId === "number"
            ? activityNameMap.get(item.activityId) ?? null
            : null,
      })
    );

    // Fetch userApprove from records
    const recordIds = Array.from(new Set(items.map((log) => log.recordId)));
    let recordMap = new Map<string, any>();
    
    if (recordIds.length > 0) {
      const records = await this.recordRepository.find({
        where: { recordId: In(recordIds) },
        select: ["recordId", "userApprove"],
      });
      recordMap = new Map(records.map((r) => [r.recordId, r.userApprove]));
    }

    const finalItems = itemsWithActivityName.map((item) => ({
      ...item,
      assignees: recordMap.get(item.recordId) || [],
    }));

    return {
      items: finalItems,
      total,
      page,
      pageSize,
    };
  }
}
