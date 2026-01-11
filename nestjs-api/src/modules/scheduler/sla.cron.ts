import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SlaTrackingService } from "../sla/sla-tracking.service";

@Injectable()
export class SlaCronJob {
  private readonly logger = new Logger(SlaCronJob.name);

  constructor(private readonly slaTrackingService: SlaTrackingService) {}

  @Cron(CronExpression.EVERY_WEEKEND)
  // @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    await this.runSlaCheck();
  }

  /**
   * Chạy kiểm tra SLA violation (có thể gọi thủ công)
   */
  async runSlaCheck(): Promise<{
    success: boolean;
    waitingRecordsChecked: number;
    violatedRecordsChecked: number;
    message?: string;
    error?: string;
  }> {
    this.logger.log("Running SLA violation check...");
    try {
      // Kiểm tra records đang chờ
      await this.slaTrackingService.checkAllWaitingRecords();
      // Kiểm tra records đã vi phạm (để cập nhật số lần vi phạm)
      await this.slaTrackingService.checkViolatedRecords();

      const waitingCount =
        await this.slaTrackingService.getWaitingRecordsCount();
      const violatedCount =
        await this.slaTrackingService.getViolatedRecordsCount();

      this.logger.log("SLA violation check completed");

      return {
        success: true,
        waitingRecordsChecked: waitingCount,
        violatedRecordsChecked: violatedCount,
        message: "SLA violation check completed successfully",
      };
    } catch (error: any) {
      this.logger.error("Error in SLA violation check:", error);
      return {
        success: false,
        waitingRecordsChecked: 0,
        violatedRecordsChecked: 0,
        error: error.message || "Unknown error occurred",
      };
    }
  }
}
