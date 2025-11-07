import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("sla_tracking")
@Index(["model", "recordId"])
export class SlaTrackingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  model!: string;

  @Column({ name: "record_id" })
  recordId!: string;

  @Column({ name: "flow_id", type: "varchar", nullable: true })
  flowId!: string | null;

  @Column({ name: "step_code" })
  stepCode!: string;

  @Column({ name: "start_time", type: "timestamptz" })
  startTime!: Date;

  @Column({ name: "end_time", type: "timestamptz", nullable: true })
  endTime!: Date | null;

  @Column({ name: "status", default: "waiting" })
  status!: "waiting" | "completed" | "violated";

  @Column({ name: "violation_count", type: "int", default: 0 })
  violationCount!: number;

  @Column({ name: "last_violation_time", type: "timestamptz", nullable: true })
  lastViolationTime!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
