import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { OdooController } from "./odoo.controller";
import { OdooService } from "./odoo.service";

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity])],
  controllers: [OdooController],
  providers: [OdooService],
  exports: [OdooService],
})
export class OdooIntegrationModule {}
