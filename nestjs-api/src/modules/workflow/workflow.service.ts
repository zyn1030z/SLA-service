import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
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
    const results = await this.workflowRepository.find({
      order: { createdAt: "DESC" },
    });
    console.log("[WorkflowService.findAll] Returned workflows:", {
      count: results.length,
      ids: results.map((w) => w.id),
    });
    return results;
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

    // BREAKPOINT: Trước khi tạo workflow entity
    debugger;
    console.log(`🔵 [create] Creating workflow with data:`, {
      systemId: workflowData.systemId,
      workflowName: workflowData.workflowName,
      model: workflowData.model,
      odooWorkflowId: workflowData.odooWorkflowId,
    });

    const workflow = this.workflowRepository.create(workflowData);

    // BREAKPOINT: Trước khi lưu xuống database - ĐÂY LÀ ĐIỂM QUAN TRỌNG
    debugger;
    console.log(`💾 [create] About to save workflow to database:`, {
      id: workflow.id,
      workflowName: workflow.workflowName,
      systemId: workflow.systemId,
    });

    const savedWorkflow = await this.workflowRepository.save(workflow);

    // BREAKPOINT: Sau khi lưu xuống database thành công
    debugger;
    console.log(`✅ [create] Workflow saved successfully:`, {
      id: savedWorkflow.id,
      workflowName: savedWorkflow.workflowName,
      createdAt: savedWorkflow.createdAt,
    });

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

      // Ensure systemId and systemName are set
      // Map workflowId to both workflowId and odooWorkflowId if needed
      const workflowWithSystemInfo = {
        ...workflowData,
        systemId: systemId,
        systemName: `System ${systemId}`, // TODO: Get actual system name from SystemEntity
        // Map workflowId to odooWorkflowId if odooWorkflowId is not set
        odooWorkflowId: workflowData.workflowId,
      };

      // Find existing workflow by systemId + odooWorkflowId (from Odoo)
      let existingWorkflow: WorkflowEntity | null = null;
      if (workflowData.workflowId) {
        existingWorkflow = await this.workflowRepository.findOne({
          where: {
            systemId: systemId,
            odooWorkflowId: workflowData.workflowId,
          },
        });
      }

      // Fallback: nếu không tìm thấy theo odooWorkflowId, thử khớp theo systemId + model
      if (!existingWorkflow) {
        existingWorkflow = await this.workflowRepository.findOne({
          where: {
            systemId: systemId,
            model: workflowData.model,
          },
        });
      }

      let workflow: WorkflowEntity;
      if (existingWorkflow) {
        const { activities, ...updateData } = workflowWithSystemInfo as any;
        delete updateData.id;
        Object.assign(existingWorkflow, updateData);
        workflow = await this.workflowRepository.save(existingWorkflow);
        if (workflowData.activities && workflowData.activities.length > 0) {
          await this.updateOrCreateActivities(
            workflow.id,
            workflowData.activities
          );
        }
      } else {
        workflow = await this.create(workflowWithSystemInfo);
        if (workflowData.activities && workflowData.activities.length > 0) {
          await this.saveActivities(workflow.id, workflowData.activities);
        }
      }
      syncedWorkflows.push(workflow);
    }

    // Update system counters after syncing all workflows
    try {
      await this.updateSystemCounters(systemId);
    } catch (error) {
      console.error(
        `❌ [syncWorkflows] Could not update system counters for ${systemId}:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    return syncedWorkflows;
  }

  /**
   * Update existing activities or create new ones
   * Only deletes activities that are no longer in the new list
   */
  private async updateOrCreateActivities(
    workflowId: string,
    activities: any[]
  ): Promise<void> {
    // Get list of activityIds from new data
    const newActivityIds = activities
      .map((a) => a.id)
      .filter((id) => id != null);

    // Find existing activities for this workflow
    const existingActivities = await this.activityRepository.find({
      where: { workflowId },
    });

    // Create a map of existing activities by activityId for quick lookup
    const existingActivitiesMap = new Map<number, ActivityEntity>();
    existingActivities.forEach((activity) => {
      existingActivitiesMap.set(activity.activityId, activity);
    });

    // Process each activity from new data
    for (const activityData of activities) {
      const activityId = activityData.id;
      if (!activityId) {
        console.warn(`⚠️ Activity without id skipped:`, activityData);
        continue;
      }

      const existingActivity = existingActivitiesMap.get(activityId);

      // Prepare activity data
      const activityUpdateData = {
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
      };

      let savedActivity: ActivityEntity;

      if (existingActivity) {
        // Update existing activity - preserve frontend-specific fields
        Object.assign(existingActivity, activityUpdateData);
        // Keep existing frontend-specific values if they exist
        // (violationAction, slaHours, maxViolations, isActive)
        savedActivity = await this.activityRepository.save(existingActivity);
      } else {
        // Create new activity with defaults for frontend-specific fields
        const newActivity = this.activityRepository.create({
          ...activityUpdateData,
          violationAction: "notify" as const,
          slaHours: 24,
          maxViolations: 3,
          isActive: true,
        });
        savedActivity = await this.activityRepository.save(newActivity);
      }

      // Update transitions for this activity
      if (activityData.transitions && activityData.transitions.length > 0) {
        // Delete old transitions first
        await this.transitionRepository.delete({
          activityId: savedActivity.id,
        });
        // Create new transitions
        await this.saveTransitions(savedActivity.id, activityData.transitions);
      }
    }

    // Delete activities that are no longer in the new list
    const activitiesToDelete = existingActivities.filter(
      (activity) => !newActivityIds.includes(activity.activityId)
    );

    if (activitiesToDelete.length > 0) {
      const idsToDelete = activitiesToDelete.map((a) => a.id);
      await this.activityRepository.delete({
        id: In(idsToDelete),
      });
    }
  }

  /**
   * Save activities (legacy method - creates new activities only)
   * Used for new workflows
   */
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

  async deleteActivity(activityId: string): Promise<boolean> {
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) {
      return false;
    }
    // Delete related transitions first
    await this.transitionRepository.delete({ activityId: activity.id });
    // Delete the activity
    await this.activityRepository.delete({ id: activity.id });
    // Recalculate steps for the parent workflow
    if (activity.workflowId) {
      const remainingActivitiesCount = await this.activityRepository.count({
        where: { workflowId: activity.workflowId },
      });
      const parentWorkflow = await this.workflowRepository.findOne({
        where: { id: activity.workflowId },
      });
      if (parentWorkflow) {
        parentWorkflow.steps = remainingActivitiesCount;
        await this.workflowRepository.save(parentWorkflow);
      }
    }
    return true;
  }
}
