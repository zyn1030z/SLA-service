import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { WorkflowEntity } from "./workflow.entity";
import { TransitionEntity } from "./transition.entity";

@Entity("activities")
@Index(["workflowId", "id"])
export class ActivityEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "workflow_id", type: "uuid" })
  workflowId!: string;

  @Column({ name: "activity_id", type: "int" })
  activityId!: number;

  @Column({ name: "name" })
  name!: string;

  @Column({ name: "code", nullable: true })
  code?: string;

  @Column({ name: "kind" })
  kind!: string;

  @Column({ name: "split_mode" })
  splitMode!: string;

  @Column({ name: "join_mode" })
  joinMode!: string;

  @Column({ name: "flow_start", type: "boolean", default: false })
  flowStart!: boolean;

  @Column({ name: "flow_stop", type: "boolean", default: false })
  flowStop!: boolean;

  @Column({ name: "flow_cancel", type: "boolean", default: false })
  flowCancel!: boolean;

  @Column({ name: "flow_done", type: "boolean", default: false })
  flowDone!: boolean;

  @Column({ name: "action", type: "text", nullable: true })
  action?: string;

  @Column({ name: "note", type: "text", nullable: true })
  note?: string;

  // Frontend-specific columns
  @Column({
    name: "violation_action",
    type: "varchar",
    default: "notify",
  })
  violationAction!: "notify" | "auto_approve";

  @Column({
    name: "sla_hours",
    type: "int",
    default: 24,
  })
  slaHours!: number;

  @Column({
    name: "max_violations",
    type: "int",
    default: 3,
  })
  maxViolations!: number;

  @Column({
    name: "is_active",
    type: "boolean",
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.activities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "workflow_id" })
  workflow!: WorkflowEntity;

  @OneToMany(() => TransitionEntity, (transition) => transition.activity)
  transitions!: TransitionEntity[];
}
