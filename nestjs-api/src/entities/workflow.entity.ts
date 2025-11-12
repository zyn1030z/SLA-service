import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ActivityEntity } from "./activity.entity";

@Entity("workflows")
@Index(["systemId", "model"])
export class WorkflowEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "system_id", type: "int" })
  systemId!: number;

  @Column({ name: "system_name" })
  systemName!: string;

  @Column({ name: "workflow_id", type: "int", nullable: true })
  workflowId?: number;

  @Column({ name: "workflow_name" })
  workflowName!: string;

  @Column()
  model!: string;

  @Column({ name: "steps", type: "int", default: 0 })
  steps!: number;

  @Column({ name: "violations", type: "int", default: 0 })
  violations!: number;

  @Column({
    name: "status",
    type: "varchar",
    default: "active",
  })
  status!: "active" | "inactive";

  @Column({ name: "odoo_workflow_id", type: "int", nullable: true })
  odooWorkflowId!: number | null;

  @Column({ name: "on_create", type: "boolean", default: false })
  onCreate!: boolean;

  @Column({ name: "share", type: "boolean", default: false })
  share!: boolean;

  @Column({ name: "domain", type: "text", nullable: true })
  domain!: string | null;

  @Column({ name: "note", type: "text", nullable: true })
  note!: string | null;

  @Column({ name: "activity_count", type: "int", default: 0 })
  activityCount!: number;

  @Column({ name: "activities_json", type: "jsonb", nullable: true })
  activitiesJson!: any[] | null;

  // Global API Configuration for notifications and approvals
  @Column({
    name: "notify_api_config",
    type: "jsonb",
    nullable: true,
  })
  notifyApiConfig?: {
    url: string;
    method: "POST" | "GET" | "PUT";
    headers: Record<string, string>;
    body?: Record<string, any>;
  } | null;

  @Column({
    name: "auto_approve_api_config",
    type: "jsonb",
    nullable: true,
  })
  autoApproveApiConfig?: {
    approvalType: "single" | "multiple";
    singleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: Record<string, any>;
    };
    multipleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: Record<string, any>;
    };
  } | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => ActivityEntity, (activity) => activity.workflow)
  activities!: ActivityEntity[];
}
