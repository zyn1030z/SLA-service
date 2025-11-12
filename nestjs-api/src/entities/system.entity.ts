import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("systems")
export class SystemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "system_name" })
  systemName!: string;

  @Column({ name: "description", type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "base_url", type: "text", nullable: true })
  baseUrl!: string | null;

  @Column({ name: "api_key", type: "text", nullable: true })
  apiKey!: string | null;

  @Column({ name: "enabled", type: "boolean", default: false })
  enabled!: boolean;

  @Column({
    name: "status",
    type: "varchar",
    default: "disconnected",
  })
  status!: "connected" | "disconnected" | "error";

  @Column({ name: "workflows_count", type: "int", default: 0 })
  workflowsCount!: number;

  @Column({ name: "violations_count", type: "int", default: 0 })
  violationsCount!: number;

  @Column({ name: "color", type: "varchar", default: "#3B82F6" })
  color!: string;

  @Column({ name: "icon", type: "varchar", default: "🏢" })
  icon!: string;

  @Column({ name: "last_sync", type: "timestamptz", nullable: true })
  lastSync!: Date | null;

  // API Configuration fields
  @Column({ name: "workflow_endpoint", type: "text", nullable: true })
  workflowEndpoint!: string | null;

  @Column({ name: "api_method", type: "varchar", default: "POST" })
  apiMethod!: string;

  @Column({ name: "api_headers", type: "jsonb", nullable: true })
  apiHeaders!: Record<string, any> | null;

  @Column({ name: "api_request_body", type: "jsonb", nullable: true })
  apiRequestBody!: Record<string, any> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
