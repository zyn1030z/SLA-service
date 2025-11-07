import { Module } from "@nestjs/common";
import { OdooController } from "./odoo.controller";

@Module({
  controllers: [OdooController],
})
export class OdooIntegrationModule {}
