import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { SystemEntity } from "../../entities/system.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { RecordService } from "./record.service";
import { RecordController } from "./record.controller";
import { SlaModule } from "../sla/sla.module";
import { TokenGuard } from "../auth/token.guard";
import { Reflector } from "@nestjs/core";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecordEntity,
      WorkflowEntity,
      SystemEntity,
      ActivityEntity,
    ]),
    SlaModule,
  ],
  controllers: [RecordController],
  providers: [RecordService, TokenGuard, Reflector],
  exports: [RecordService],
})
export class RecordModule {}
