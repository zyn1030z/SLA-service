import { Module } from "@nestjs/common";
import { SlaCronJob } from "./sla.cron";

@Module({
  providers: [SlaCronJob],
})
export class SchedulerModule {}
