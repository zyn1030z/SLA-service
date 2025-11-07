import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ActivityEntity } from "./activity.entity";

@Entity("transitions")
@Index(["activityId", "id"])
export class TransitionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "activity_id", type: "uuid" })
  activityId!: string;

  @Column({ name: "transition_id", type: "int" })
  transitionId!: number;

  @Column({ name: "signal" })
  signal!: string;

  @Column({ name: "condition", type: "text", nullable: true })
  condition?: string;

  @Column({ name: "sequence", type: "int", default: 0 })
  sequence!: number;

  @Column({ name: "target_activity_id", type: "int" })
  targetActivityId!: number;

  @Column({ name: "target_activity_name" })
  targetActivityName!: string;

  @Column({ name: "group_required", type: "boolean", default: false })
  groupRequired!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => ActivityEntity, (activity) => activity.transitions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "activity_id" })
  activity!: ActivityEntity;
}
