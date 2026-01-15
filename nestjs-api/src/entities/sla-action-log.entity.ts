import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { RecordEntity } from "./record.entity";

@Entity("sla_action_logs")
@Index(["recordId", "actionType"])
export class SlaActionLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "record_id", type: "varchar" })
  recordId!: string;

  @Column({ name: "workflow_id", type: "int", nullable: true })
  workflowId!: number | null;

  @Column({ name: "activity_id", type: "int", nullable: true })
  activityId!: number | null;

  @Column({
    name: "action_type",
    type: "varchar",
  })
  actionType!: "notify" | "auto_approve";

  @Column({ name: "violation_count", type: "int", default: 0 })
  violationCount!: number;

  @Column({ name: "is_success", type: "boolean", default: false })
  isSuccess!: boolean;

  @Column({ name: "message", type: "text", nullable: true })
  message!: string | null;

  @ManyToOne(() => RecordEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: "record_id", referencedColumnName: "recordId" })
  record?: RecordEntity;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

