import { Module, forwardRef } from "@nestjs/common";
import { SlaCronJob } from "./sla.cron";
import { SlaModule } from "../sla/sla.module";

@Module({
  imports: [forwardRef(() => SlaModule)], // Sử dụng forwardRef để tránh circular dependency
  providers: [SlaCronJob],
  exports: [SlaCronJob], // Export để các module khác có thể sử dụng
})
export class SchedulerModule {}
