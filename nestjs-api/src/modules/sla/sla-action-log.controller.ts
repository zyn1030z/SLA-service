import { Controller, Get, Query } from "@nestjs/common";
import { ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { SlaTrackingService } from "./sla-tracking.service";

@ApiTags("sla-action-logs")
@Controller("sla/action-logs")
export class SlaActionLogController {
  constructor(private readonly slaTrackingService: SlaTrackingService) {}

  @Public()
  @Get()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({
    name: "actionType",
    required: false,
    enum: ["notify", "auto_approve"],
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Paged SLA action logs" })
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("actionType") actionType?: "notify" | "auto_approve",
    @Query("search") search?: string
  ) {
    return this.slaTrackingService.listActionLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      actionType,
      search,
    });
  }
}
