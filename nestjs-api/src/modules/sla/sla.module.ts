import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SlaTrackingEntity } from "../../entities/sla-tracking.entity";
import { SlaController } from "./sla.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SlaTrackingEntity])],
  controllers: [SlaController],
})
export class SlaModule {}
