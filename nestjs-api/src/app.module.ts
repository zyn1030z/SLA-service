import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { SystemModule } from "./modules/system/system.module";
import { SlaModule } from "./modules/sla/sla.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { OdooIntegrationModule } from "./modules/odoo/odoo-integration.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RecordModule } from "./modules/record/record.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres",
        host: "postgres",
        port: 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    ScheduleModule.forRoot(),
    WorkflowModule,
    SystemModule,
    SlaModule,
    SchedulerModule,
    NotificationModule,
    OdooIntegrationModule,
    AuthModule,
    RecordModule,
  ],
})
export class AppModule {}
