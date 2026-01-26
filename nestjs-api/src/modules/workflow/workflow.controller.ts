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
    try {
      const workflow = await this.workflowService.findOne(id);
      if (!workflow) {
        return null;
      }
      return workflow;
    } catch (error) {
      console.error("Error fetching workflow:", error);
      throw error;
    }
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
      notifyApiConfig?: {
        url: string;
        method: "POST" | "GET" | "PUT";
        headers: Record<string, string>;
        body?: Record<string, any>;
      };
      autoApproveApiConfig?: {
        approvalType: "single" | "multiple";
        singleApprovalConfig?: {
          url: string;
          method: "POST" | "GET" | "PUT";
          headers: Record<string, string>;
          body?: Record<string, any>;
        };
        multipleApprovalConfig?: {
          url: string;
          method: "POST" | "GET" | "PUT";
          headers: Record<string, string>;
          body?: Record<string, any>;
        };
      };
    }
  ) {
    return this.workflowService.updateActivity(activityId, updateData);
  }

  @Public()
  @Post("activity")
  async createActivity(@Body() createActivityDto: {
    workflowId: string;
    stepName: string;
    stepCode: string;
    slaHours: number;
    violationAction: "notify" | "auto_approve";
    maxViolations: number;
    order: number;
  }) {
    return this.workflowService.createActivity(createActivityDto);
  }

  @Public()
  @Delete("activity/:activityId")
  async deleteActivity(@Param("activityId") activityId: string) {
    const success = await this.workflowService.deleteActivity(activityId);
    return { success };
  }
}
