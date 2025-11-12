import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SlaTrackingEntity } from "../../entities/sla-tracking.entity";
import { RecordEntity } from "../../entities/record.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { SlaController } from "./sla.controller";
import { SlaTrackingService } from "./sla-tracking.service";
import { OdooIntegrationModule } from "../odoo/odoo-integration.module";
import { SchedulerModule } from "../scheduler/scheduler.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SlaTrackingEntity, RecordEntity, ActivityEntity]),
    OdooIntegrationModule,
    forwardRef(() => SchedulerModule), // Sử dụng forwardRef để tránh circular dependency
  ],
  controllers: [SlaController],
  providers: [SlaTrackingService],
  exports: [SlaTrackingService],
})
export class SlaModule {}
