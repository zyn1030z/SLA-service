import "reflect-metadata";
import { DataSource } from "typeorm";
import { SystemEntity } from "./entities/system.entity";
import { WorkflowEntity } from "./entities/workflow.entity";
import { ActivityEntity } from "./entities/activity.entity";
import { TransitionEntity } from "./entities/transition.entity";
import { RecordEntity } from "./entities/record.entity";
import { SlaActionLogEntity } from "./entities/sla-action-log.entity";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.TYPEORM_HOST || process.env.POSTGRES_HOST || "postgres",
  port: Number(process.env.TYPEORM_PORT || 5432),
  username: process.env.TYPEORM_USERNAME || process.env.POSTGRES_USER,
  password: process.env.TYPEORM_PASSWORD || process.env.POSTGRES_PASSWORD,
  database: process.env.TYPEORM_DATABASE || process.env.POSTGRES_DB,
  entities: [
    SystemEntity,
    WorkflowEntity,
    ActivityEntity,
    TransitionEntity,
    RecordEntity,
    SlaActionLogEntity,
  ],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  synchronize: false,
  logging: false,
  extra: {
    timezone: 'UTC', // Force UTC timezone for all database operations
  },
});

export default dataSource;

