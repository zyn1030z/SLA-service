import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemEntity } from "../../entities/system.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { SystemController } from "./system.controller";
import { SystemService } from "./system.service";

@Module({
  imports: [TypeOrmModule.forFeature([SystemEntity, WorkflowEntity])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
