import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { TransitionEntity } from "../../entities/transition.entity";
import { SystemEntity } from "../../entities/system.entity";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      ActivityEntity,
      TransitionEntity,
      SystemEntity,
    ]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
