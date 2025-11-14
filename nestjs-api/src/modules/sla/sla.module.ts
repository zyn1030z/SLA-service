import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SlaTrackingEntity } from "../../entities/sla-tracking.entity";
import { RecordEntity } from "../../entities/record.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { SlaActionLogEntity } from "../../entities/sla-action-log.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { SlaController } from "./sla.controller";
import { SlaActionLogController } from "./sla-action-log.controller";
import { SlaTrackingService } from "./sla-tracking.service";
import { OdooIntegrationModule } from "../odoo/odoo-integration.module";
import { SchedulerModule } from "../scheduler/scheduler.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SlaTrackingEntity,
      RecordEntity,
      ActivityEntity,
      SlaActionLogEntity,
      WorkflowEntity,
    ]),
    OdooIntegrationModule,
    forwardRef(() => SchedulerModule), // Sử dụng forwardRef để tránh circular dependency
  ],
  controllers: [SlaController, SlaActionLogController],
  providers: [SlaTrackingService],
  exports: [SlaTrackingService],
})
export class SlaModule {}
