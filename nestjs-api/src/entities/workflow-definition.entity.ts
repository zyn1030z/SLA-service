import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("workflow_definition")
export class WorkflowDefinitionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "flow_name" })
  flowName!: string;

  @Column({ name: "model" })
  model!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
