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
import { ReportsModule } from "./modules/reports/reports.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres",
        host: process.env.TYPEORM_HOST || process.env.POSTGRES_HOST || "postgres",
        port: Number(process.env.TYPEORM_PORT || process.env.POSTGRES_PORT || 5432),
        username: process.env.TYPEORM_USERNAME || process.env.POSTGRES_USER,
        password: process.env.TYPEORM_PASSWORD || process.env.POSTGRES_PASSWORD,
        database: process.env.TYPEORM_DATABASE || process.env.POSTGRES_DB,
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
    ReportsModule,
    UsersModule,
  ],
})
export class AppModule {}
