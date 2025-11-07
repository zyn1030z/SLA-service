import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { WorkflowDefinitionEntity } from "./workflow-definition.entity";

@Entity("workflow_step")
export class WorkflowStepEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => WorkflowDefinitionEntity)
  flow!: WorkflowDefinitionEntity;

  @Column({ name: "step_order", type: "int" })
  stepOrder!: number;

  @Column({ name: "step_code" })
  stepCode!: string;

  @Column({ name: "step_name" })
  stepName!: string;

  @Column({ name: "sla_hours", type: "int" })
  slaHours!: number;

  @Column({ name: "action_on_violation" })
  actionOnViolation!: "notify" | "auto_approve";
}
