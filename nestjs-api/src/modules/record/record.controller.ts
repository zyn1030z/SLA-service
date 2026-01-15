import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";
import { Public } from "../auth/public.decorator";
import { RequireToken } from "../auth/require-token.decorator";
import { TokenGuard } from "../auth/token.guard";
import {
  CreateRecordDto,
  RecordService,
  UpdateRecordDto,
} from "./record.service";

class CreateRecordRequestDto {
  recordId!: string;
  model!: string;
  odooWorkflowId?: number | null; // Use this to find workflowId and systemId
  systemId?: number | null; // Optional: can be derived from odooWorkflowId
  workflowId?: number | null; // Optional: can be derived from odooWorkflowId
  workflowName?: string | null;
  stepCode?: string | null;
  stepName?: string | null;
  startTime?: string | Date | null;
  status?: "waiting" | "violated" | "completed";
  violationCount?: number;
  slaHours?: number;
  remainingHours?: number;
}

@ApiTags("records")
@Controller("records")
export class RecordController {
  constructor(
    private readonly recordService: RecordService,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List records with pagination and filters" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["waiting", "violated", "completed"],
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "model", required: false, type: String })
  @ApiQuery({ name: "workflowId", required: false, type: String })
  @ApiQuery({ name: "step", required: false, type: String })
  @ApiQuery({ name: "assignee", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: Number })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Paged record list" })
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: "waiting" | "violated" | "completed",
    @Query("search") search?: string,
    @Query("model") model?: string,
    @Query("workflowId") workflowId?: string,
    @Query("step") step?: string,
    @Query("assignee") assignee?: string,
    @Query("userId") userId?: string,
    @Query("days") days?: string
  ) {
    return this.recordService.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      search,
      model,
      workflowId: workflowId ? Number(workflowId) : undefined,
      step,
      assignee,
      userId: userId ? Number(userId) : undefined,
      days: days ? Number(days) : undefined,
    });
  }

  @Public()
  @Get("steps")
  @ApiOperation({ summary: "Get distinct step names" })
  @ApiResponse({ status: 200, description: "List of distinct step names" })
  async steps() {
    // Query distinct step_name from record table
    const qb = this.recordRepository
      .createQueryBuilder("r")
      .select("DISTINCT r.step_name", "step")
      .where("r.step_name IS NOT NULL")
      .orderBy("r.step_name", "ASC");

    const rows = await qb.getRawMany();
    const steps = rows.map((r: any) => r.step).filter(Boolean);
    return { success: true, steps };
  }

  // Endpoint cho Odoo tạo bản ghi record theo dõi
  @Public() // Vẫn public nhưng yêu cầu token
  @UseGuards(TokenGuard) // Áp dụng TokenGuard để kiểm tra token
  @RequireToken() // Yêu cầu token trong header để bảo mật
  @Post()
  @ApiOperation({
    summary: "Create a record (Odoo integration)",
    description:
      "Requires API token in 'x-api-token' or 'api-token' header for security",
  })
  @ApiBody({
    type: CreateRecordRequestDto,
    description: "Payload to create a tracking record from Odoo",
    schema: {
      example: {
        recordId: "PO-12345",
        model: "purchase.order",
        odooWorkflowId: 4, // Use this to find workflowId and systemId automatically
        workflowName: "Purchase Order Approval",
        stepCode: "manager_approval",
        stepName: "Manager Approval",
        startTime: "2025-10-20T08:00:00Z",
        status: "waiting",
        violationCount: 0,
        slaHours: 24,
        remainingHours: 18,
      },
    },
  })
  @ApiResponse({ status: 200, description: "Record created" })
  async create(@Body() body: CreateRecordDto) {
    // Tối thiểu yêu cầu recordId và model
    if (!body.recordId || !body.model) {
      throw new BadRequestException("recordId and model are required");
    }
    // Require either odooWorkflowId or both workflowId and systemId
    if (!body.odooWorkflowId && (!body.workflowId || !body.systemId)) {
      throw new BadRequestException(
        "Either odooWorkflowId or both workflowId and systemId are required"
      );
    }
    const result = await this.recordService.create(body);

    return {
      success: true,
      record: result.record,
      isExisting: result.isExisting,
      message: result.isExisting
        ? "Record already exists, returning existing record"
        : "Record created successfully"
    };
  }

  @Public()
  @Put(":id")
  @ApiOperation({ summary: "Update a record" })
  @ApiResponse({ status: 200, description: "Record updated" })
  async update(
    @Param("id") recordId: string,
    @Body() body: UpdateRecordDto
  ) {
    if (Object.keys(body).length === 0) {
      throw new BadRequestException("Request body cannot be empty");
    }

    // Find the record by recordId and stepCode
    const where: any = {
      recordId: recordId,
    };
    const bodyAny = body as any;
    if (bodyAny.stage_code_old !== null && bodyAny.stage_code_old !== undefined) {
      where.stepCode = bodyAny.stage_code_old;
    }
    const recordsToUpdate = await this.recordRepository.find({
      where,
    });
    if (!recordsToUpdate || recordsToUpdate.length === 0) {
      throw new BadRequestException(`No records found with recordId=${recordId} and stepCode=${bodyAny.stage_code_old || 'any'}`);
    }

    // Filter records where user has approval permission
    let authorizedRecords = recordsToUpdate;
    if (bodyAny.user_approve) {
      authorizedRecords = recordsToUpdate.filter(record =>
        record.userApprove?.some(user => user.login === bodyAny.user_approve)
      );
      if (authorizedRecords.length === 0) {
        throw new BadRequestException(`User ${bodyAny.user_approve} is not authorized to approve any of these records`);
      }
    }

    // Update all authorized records
    // Remove unwanted fields from body before update
    const { user_approve, stage_code_old, ...updateBody } = body as any;
    const updatePromises = authorizedRecords.map(record =>
      this.recordService.update(record.id, updateBody)
    );
    const updatedRecords = await Promise.all(updatePromises);

    return { success: true, updatedRecords, count: updatedRecords.length };
  }
}
