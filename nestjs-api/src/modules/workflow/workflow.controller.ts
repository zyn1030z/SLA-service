import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  ForbiddenException,
} from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import {
  WorkflowService,
  CreateWorkflowDto,
  UpdateWorkflowDto,
} from "./workflow.service";

@Controller("workflows")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Public()
  @Get()
  async getAllWorkflows() {
    return this.workflowService.findAll();
  }

  @Public()
  @Get("system/:systemId")
  async getWorkflowsBySystem(@Param("systemId") systemId: string) {
    return this.workflowService.findBySystem(systemId);
  }

  @Public()
  @Get(":id")
  async getWorkflow(@Param("id") id: string) {
    return this.workflowService.findOne(id);
  }

  @Public()
  @Post()
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
    // Tạm thời chặn tạo mới workflow ngoài luồng sync
    throw new ForbiddenException(
      "Workflow creation is disabled temporarily. Please use sync endpoint."
    );
  }

  @Public()
  @Put(":id")
  async updateWorkflow(
    @Param("id") id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Public()
  @Delete(":id")
  async deleteWorkflow(@Param("id") id: string) {
    const result = await this.workflowService.remove(id);
    return { success: result };
  }

  @Public()
  @Post("sync/:systemId")
  async syncWorkflows(
    @Param("systemId") systemId: string,
    @Body() body: { workflows?: any[] }
  ) {
    const workflows = await this.workflowService.syncWorkflows(
      systemId,
      body.workflows || []
    );
    return {
      success: true,
      workflowsCount: workflows.length,
      workflows: workflows,
    };
  }

  @Public()
  @Put("activity/:activityId")
  async updateActivity(
    @Param("activityId") activityId: string,
    @Body()
    updateData: {
      violationAction?: "notify" | "auto_approve";
      slaHours?: number;
      maxViolations?: number;
      isActive?: boolean;
    }
  ) {
    return this.workflowService.updateActivity(activityId, updateData);
  }

  @Public()
  @Delete("activity/:activityId")
  async deleteActivity(@Param("activityId") activityId: string) {
    const success = await this.workflowService.deleteActivity(activityId);
    return { success };
  }
}
