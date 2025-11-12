import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { OdooService } from "../odoo/odoo.service";

@Injectable()
export class SlaTrackingService {
  private readonly logger = new Logger(SlaTrackingService.name);

  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
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

    // update realtime
    record.remainingHours = this.calculateRemainingHours(record, activity);
    await this.recordRepository.save(record);

    // Chỉ cập nhật nếu số lần vi phạm thay đổi
    if (newViolationCount > oldViolationCount) {
      record.violationCount = newViolationCount;

      record.remainingHours = this.calculateRemainingHours(record, activity);

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
    const startTime = new Date(record.startTime);
    const elapsedHours =
      (nowWithOffset.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const slaHours = activity.slaHours || record.slaHours || 24;
    const remaining = slaHours - elapsedHours;

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
      // Gửi thông báo
      await this.odooService.sendNotification(record, activity);
    } else if (violationAction === "auto_approve") {
      // Gửi yêu cầu phê duyệt tự động
      await this.odooService.sendAutoApproval(
        record,
        activity,
        newViolationCount
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
}
