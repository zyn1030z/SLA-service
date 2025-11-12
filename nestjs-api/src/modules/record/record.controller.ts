import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { CreateRecordDto, RecordService } from "./record.service";

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
  constructor(private readonly recordService: RecordService) {}

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
  @ApiResponse({ status: 200, description: "Paged record list" })
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: "waiting" | "violated" | "completed",
    @Query("search") search?: string,
    @Query("model") model?: string,
    @Query("workflowId") workflowId?: string
  ) {
    return this.recordService.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      search,
      model,
      workflowId: workflowId ? Number(workflowId) : undefined,
    });
  }

  // Endpoint cho Odoo tạo bản ghi record theo dõi
  @Public()
  @Post()
  @ApiOperation({ summary: "Create a record (Odoo integration)" })
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
  @ApiResponse({ status: 201, description: "Record created" })
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
    const record = await this.recordService.create(body);
    return { success: true, record };
  }
}
