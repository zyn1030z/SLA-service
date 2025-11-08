import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkflowEntity } from "../../entities/workflow.entity";
import { ActivityEntity } from "../../entities/activity.entity";
import { TransitionEntity } from "../../entities/transition.entity";
import { SystemEntity } from "../../entities/system.entity";
// import { ApiProperty } from "@nestjs/swagger";

export class CreateWorkflowDto {
  // @ApiProperty({ description: "System ID" })
  systemId!: string;

  // @ApiProperty({ description: "System name" })
  systemName!: string;

  // @ApiProperty({ description: "Workflow name" })
  workflowName!: string;

  // @ApiProperty({ description: "Model name" })
  model!: string;

  // @ApiProperty({ description: "Number of steps", required: false, default: 0 })
  steps?: number;

  // @ApiProperty({ description: "Number of violations", required: false, default: 0 })
  violations?: number;

  // @ApiProperty({ description: "Workflow status", enum: ["active", "inactive"], required: false, default: "active" })
  status?: "active" | "inactive";

  // @ApiProperty({ description: "Odoo workflow ID", required: false })
  odooWorkflowId?: number;

  // @ApiProperty({ description: "Workflow ID from Odoo", required: false })
  workflowId?: number;

  // @ApiProperty({ description: "Create on creation", required: false, default: false })
  onCreate?: boolean;

  // @ApiProperty({ description: "Share workflow", required: false, default: false })
  share?: boolean;

  // @ApiProperty({ description: "Domain filter", required: false })
  domain?: string;

  // @ApiProperty({ description: "Note", required: false })
  note?: string;

  // @ApiProperty({ description: "Activity count", required: false, default: 0 })
  activityCount?: number;

  // @ApiProperty({ description: "Activities data", required: false, type: "array" })
  activities?: any[];
}

export class UpdateWorkflowDto {
  // @ApiProperty({ description: "Workflow name", required: false })
  workflowName?: string;

  // @ApiProperty({ description: "Model name", required: false })
  model?: string;

  // @ApiProperty({ description: "Number of steps", required: false })
  steps?: number;

  // @ApiProperty({ description: "Number of violations", required: false })
  violations?: number;

  // @ApiProperty({ description: "Workflow status", enum: ["active", "inactive"], required: false })
  status?: "active" | "inactive";

  // @ApiProperty({ description: "Odoo workflow ID", required: false })
  odooWorkflowId?: number;

  // @ApiProperty({ description: "Create on creation", required: false })
  onCreate?: boolean;

  // @ApiProperty({ description: "Share workflow", required: false })
  share?: boolean;

  // @ApiProperty({ description: "Domain filter", required: false })
  domain?: string;

  // @ApiProperty({ description: "Note", required: false })
  note?: string;

  // @ApiProperty({ description: "Activity count", required: false })
  activityCount?: number;

  // @ApiProperty({ description: "Activities data", required: false, type: "array" })
  activities?: any[];
}

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    @InjectRepository(TransitionEntity)
    private transitionRepository: Repository<TransitionEntity>,
    @InjectRepository(SystemEntity)
    private systemRepository: Repository<SystemEntity>
  ) {}

  async findAll(): Promise<WorkflowEntity[]> {
    return this.workflowRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findBySystem(systemId: string): Promise<WorkflowEntity[]> {
    return this.workflowRepository.find({
      where: { systemId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findOne({
      where: { id },
      relations: ["activities", "activities.transitions"],
    });
  }

  async create(createWorkflowDto: CreateWorkflowDto): Promise<WorkflowEntity> {
    // Extract activities before creating workflow to avoid mapping issues
    const { activities, ...workflowData } = createWorkflowDto;

    const workflow = this.workflowRepository.create(workflowData);
    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Update system counters (only if system exists)
    try {
      await this.updateSystemCounters(createWorkflowDto.systemId);
    } catch (error) {
      console.warn(
        `Could not update system counters for ${createWorkflowDto.systemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return savedWorkflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowEntity | null> {
    const workflow = await this.findOne(id);
    if (!workflow) {
      return null;
    }

    Object.assign(workflow, updateWorkflowDto);
    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Update system counters
    await this.updateSystemCounters(workflow.systemId);

    return savedWorkflow;
  }

  async remove(id: string): Promise<boolean> {
    const workflow = await this.findOne(id);
    if (!workflow) {
      return false;
    }

    const systemId = workflow.systemId;
    await this.workflowRepository.remove(workflow);

    // Update system counters
    await this.updateSystemCounters(systemId);

    return true;
  }

  async removeBySystem(systemId: string): Promise<number> {
    // Find workflows for this system
    const workflows = await this.workflowRepository.find({
      where: { systemId },
    });

    // Delete activities and transitions first (cascade will handle this, but let's be explicit)
    for (const workflow of workflows) {
      // Find activities for this workflow
      const activities = await this.activityRepository.find({
        where: { workflowId: workflow.id },
      });

      // Delete transitions for each activity
      for (const activity of activities) {
        await this.transitionRepository.delete({ activityId: activity.id });
      }

      // Delete activities
      await this.activityRepository.delete({ workflowId: workflow.id });
    }

    // Then delete workflows
    const result = await this.workflowRepository.delete({ systemId });
    return result.affected || 0;
  }

  async syncWorkflows(
    systemId: string,
    workflows: CreateWorkflowDto[]
  ): Promise<WorkflowEntity[]> {
    // BREAKPOINT 10: Bắt đầu syncWorkflows service
    debugger;
    console.log(`🔄 [syncWorkflows] Starting sync for systemId: ${systemId}`);
    console.log(
      `🔄 [syncWorkflows] Total workflows to sync: ${workflows.length}`
    );

    // Sync workflows: update if exists, create if not
    const syncedWorkflows: WorkflowEntity[] = [];

    for (let i = 0; i < workflows.length; i++) {
      const workflowData = workflows[i];
      console.log(
        `\n📦 [syncWorkflows] Processing workflow ${i + 1}/${workflows.length}:`
      );
      console.log(`   - workflowId: ${workflowData.workflowId}`);
      console.log(`   - odooWorkflowId: ${workflowData.odooWorkflowId}`);
      console.log(`   - workflowName: ${workflowData.workflowName}`);
      console.log(`   - model: ${workflowData.model}`);
      console.log(
        `   - activities count: ${workflowData.activities?.length || 0}`
      );

      // Ensure systemId and systemName are set
      // Map workflowId to both workflowId and odooWorkflowId if needed
      const workflowWithSystemInfo = {
        ...workflowData,
        systemId: systemId,
        systemName: `System ${systemId}`, // TODO: Get actual system name from SystemEntity
        // Map workflowId to odooWorkflowId if odooWorkflowId is not set
        odooWorkflowId: workflowData.odooWorkflowId || workflowData.workflowId,
      };

      // Find existing workflow by systemId + odooWorkflowId (from Odoo)
      let existingWorkflow: WorkflowEntity | null = null;
      if (workflowData.odooWorkflowId) {
        // BREAKPOINT 11: Trước khi tìm workflow trong database
        debugger;
        console.log(
          `   🔍 [syncWorkflows] Searching for existing workflow with odooWorkflowId: ${workflowData.odooWorkflowId}`
        );
        console.log(
          `   📊 [DEBUG] workflowData:`,
          JSON.stringify(workflowData, null, 2)
        );
        existingWorkflow = await this.workflowRepository.findOne({
          where: {
            systemId: systemId,
            odooWorkflowId: workflowData.odooWorkflowId,
          },
        });
        // BREAKPOINT 12: Sau khi tìm workflow - kiểm tra kết quả
        debugger;
        console.log(
          `   📊 [DEBUG] existingWorkflow:`,
          existingWorkflow ? `Found: ${existingWorkflow.id}` : "Not found"
        );

        if (existingWorkflow) {
          console.log(
            `   ✅ [syncWorkflows] Found existing workflow: id=${existingWorkflow.id}, name=${existingWorkflow.workflowName}`
          );
        } else {
          console.log(
            `   ❌ [syncWorkflows] No existing workflow found, will create new one`
          );
        }
      } else {
        console.log(
          `   ⚠️  [syncWorkflows] No odooWorkflowId provided, will create new workflow`
        );
      }

      let workflow: WorkflowEntity;

      if (existingWorkflow) {
        // Update existing workflow
        // BREAKPOINT 13: Trước khi update workflow
        debugger;
        console.log(`   🔄 [syncWorkflows] Updating existing workflow...`);
        console.log(`   📊 [DEBUG] existingWorkflow before update:`, {
          id: existingWorkflow.id,
          name: existingWorkflow.workflowName,
          model: existingWorkflow.model,
        });
        // Extract activities before updating to avoid mapping issues
        const { activities, ...updateData } = workflowWithSystemInfo;

        Object.assign(existingWorkflow, updateData);
        workflow = await this.workflowRepository.save(existingWorkflow);
        // BREAKPOINT 14: Sau khi save workflow
        debugger;
        console.log(
          `   ✅ [syncWorkflows] Workflow updated: id=${workflow.id}`
        );
        console.log(`   📊 [DEBUG] workflow after save:`, {
          id: workflow.id,
          name: workflow.workflowName,
          model: workflow.model,
        });

        // Update activities: remove old ones and create new ones
        if (workflowData.activities && workflowData.activities.length > 0) {
          console.log(`   🗑️  [syncWorkflows] Deleting old activities...`);
          const deleteResult = await this.activityRepository.delete({
            workflowId: workflow.id,
          });
          console.log(
            `   ✅ [syncWorkflows] Deleted ${
              deleteResult.affected || 0
            } activities`
          );

          console.log(
            `   ➕ [syncWorkflows] Creating ${workflowData.activities.length} new activities...`
          );
          await this.saveActivities(workflow.id, workflowData.activities);
          console.log(`   ✅ [syncWorkflows] Activities created successfully`);
        }
      } else {
        // Create new workflow
        // BREAKPOINT 15: Trước khi create workflow mới
        debugger;
        console.log(`   ➕ [syncWorkflows] Creating new workflow...`);
        console.log(`   📊 [DEBUG] workflowWithSystemInfo:`, {
          systemId: workflowWithSystemInfo.systemId,
          workflowName: workflowWithSystemInfo.workflowName,
          model: workflowWithSystemInfo.model,
          odooWorkflowId: workflowWithSystemInfo.odooWorkflowId,
        });
        workflow = await this.create(workflowWithSystemInfo);
        // BREAKPOINT 16: Sau khi create workflow
        debugger;
        console.log(
          `   ✅ [syncWorkflows] Workflow created: id=${workflow.id}`
        );
        console.log(`   📊 [DEBUG] created workflow:`, {
          id: workflow.id,
          name: workflow.workflowName,
          model: workflow.model,
          systemId: workflow.systemId,
        });

        // Save activities to separate table if they exist
        if (workflowData.activities && workflowData.activities.length > 0) {
          console.log(
            `   ➕ [syncWorkflows] Creating ${workflowData.activities.length} activities...`
          );
          await this.saveActivities(workflow.id, workflowData.activities);
          console.log(`   ✅ [syncWorkflows] Activities created successfully`);
        }
      }

      syncedWorkflows.push(workflow);
      console.log(
        `   ✅ [syncWorkflows] Workflow ${i + 1} processed successfully\n`
      );
    }

    console.log(
      `\n📊 [syncWorkflows] Sync completed: ${syncedWorkflows.length} workflows processed`
    );

    // Update system counters after syncing all workflows
    try {
      console.log(
        `🔄 [syncWorkflows] Updating system counters for systemId: ${systemId}`
      );
      await this.updateSystemCounters(systemId);
      console.log(`✅ [syncWorkflows] System counters updated successfully`);
    } catch (error) {
      console.error(
        `❌ [syncWorkflows] Could not update system counters for ${systemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    console.log(`✅ [syncWorkflows] Sync finished for systemId: ${systemId}\n`);
    return syncedWorkflows;
  }

  private async saveActivities(
    workflowId: string,
    activities: any[]
  ): Promise<void> {
    for (const activityData of activities) {
      // Create activity
      const activity = this.activityRepository.create({
        workflowId,
        activityId: activityData.id,
        name: activityData.name,
        code: activityData.code || null,
        kind: activityData.kind,
        splitMode: activityData.split_mode,
        joinMode: activityData.join_mode,
        flowStart: activityData.flow_start || false,
        flowStop: activityData.flow_stop || false,
        flowCancel: activityData.flow_cancel || false,
        flowDone: activityData.flow_done || false,
        action: activityData.action || null,
        note: activityData.note || null,
        // Frontend-specific columns with defaults
        violationAction: "notify",
        slaHours: 24,
        maxViolations: 3,
        isActive: true,
      });

      const savedActivity = await this.activityRepository.save(activity);

      // Save transitions if they exist
      if (activityData.transitions && activityData.transitions.length > 0) {
        await this.saveTransitions(savedActivity.id, activityData.transitions);
      }
    }
  }

  private async saveTransitions(
    activityId: string,
    transitions: any[]
  ): Promise<void> {
    for (const transitionData of transitions) {
      const transition = this.transitionRepository.create({
        activityId,
        transitionId: transitionData.id,
        signal: transitionData.signal,
        condition: transitionData.condition || null,
        sequence: transitionData.sequence || 0,
        targetActivityId: transitionData.target_activity_id,
        targetActivityName: transitionData.target_activity_name,
        groupRequired: transitionData.group_required || false,
      });

      await this.transitionRepository.save(transition);
    }
  }

  private async updateSystemCounters(systemId: string): Promise<void> {
    const system = await this.systemRepository.findOne({
      where: { id: systemId },
    });
    if (!system) {
      return;
    }

    const workflows = await this.findBySystem(systemId);
    const workflowsCount = workflows.length;
    const violationsCount = workflows.reduce(
      (sum, wf) => sum + wf.violations,
      0
    );

    system.workflowsCount = workflowsCount;
    system.violationsCount = violationsCount;
    system.lastSync = new Date();

    await this.systemRepository.save(system);
  }

  async updateActivity(
    activityId: string,
    updateData: {
      violationAction?: "notify" | "auto_approve";
      slaHours?: number;
      maxViolations?: number;
      isActive?: boolean;
    }
  ): Promise<ActivityEntity | null> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });

    if (!activity) {
      return null;
    }

    // Update only the provided fields
    if (updateData.violationAction !== undefined) {
      activity.violationAction = updateData.violationAction;
    }
    if (updateData.slaHours !== undefined) {
      activity.slaHours = updateData.slaHours;
    }
    if (updateData.maxViolations !== undefined) {
      activity.maxViolations = updateData.maxViolations;
    }
    if (updateData.isActive !== undefined) {
      activity.isActive = updateData.isActive;
    }

    return this.activityRepository.save(activity);
  }
}
