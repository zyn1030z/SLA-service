import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { WorkflowEntity } from "./workflow.entity";
import { SystemEntity } from "./system.entity";
import { ActivityEntity } from "./activity.entity";

@Entity("records")
export class RecordEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "record_id", type: "varchar" })
  recordId!: string;

  @Column({ name: "model", type: "varchar" })
  model!: string;

  @Index("idx_records_workflow_id")
  @Column({ name: "workflow_id", type: "int", nullable: true })
  workflowId!: number | null;

  @Index("idx_records_system_id")
  @Column({ name: "system_id", type: "int", nullable: true })
  systemId!: number | null;

  @Column({ name: "workflow_name", type: "varchar", nullable: true })
  workflowName!: string | null;

  @Index("idx_records_activity_id")
  @Column({ name: "activity_id", type: "int", nullable: true })
  activityId!: number | null;

  @Column({ name: "step_code", type: "varchar", nullable: true })
  stepCode!: string | null;

  @Column({ name: "step_name", type: "varchar", nullable: true })
  stepName!: string | null;

  @Column({ name: "start_time", type: "timestamptz", nullable: true })
  startTime!: Date | null;

  @Column({ name: "status", type: "varchar", default: "waiting" })
  status!: "waiting" | "violated" | "completed";

  @Column({ name: "violation_count", type: "int", default: 0 })
  violationCount!: number;

  @Column({ name: "sla_hours", type: "int", default: 24 })
  slaHours!: number;

  @Column({
    name: "remaining_hours",
    type: "numeric",
    precision: 10,
    scale: 2,
    default: 0,
  })
  remainingHours!: number;

  @Column({ name: "user_approve", type: "jsonb", nullable: true })
  userApprove!: Array<{
    id: number;
    name: string;
    login: string;
  }> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ name: "approved_at", type: "timestamptz", nullable: true })
  approvedAt!: Date | null;

  @Column({ name: "next_due_at", type: "timestamptz", nullable: true })
  nextDueAt!: Date | null;

  // Relations
  @ManyToOne(() => WorkflowEntity, {
    nullable: true,
    onDelete: "SET NULL",
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "workflow_id", referencedColumnName: "id" })
  workflow!: WorkflowEntity | null;

  @ManyToOne(() => SystemEntity, {
    nullable: true,
    onDelete: "SET NULL",
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "system_id", referencedColumnName: "id" })
  system!: SystemEntity | null;

  @ManyToOne(() => ActivityEntity, {
    nullable: true,
    onDelete: "SET NULL",
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "activity_id", referencedColumnName: "id" })
  activity!: ActivityEntity | null;
}
