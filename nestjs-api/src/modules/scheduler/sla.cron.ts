import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class SlaCronJob {
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    // TODO: check waiting records exceeding SLA and create violations
  }
}
