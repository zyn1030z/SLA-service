import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
import { ReportsService, SLAReport } from "./reports.service";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Get("sla")
  @ApiOperation({ summary: "Get SLA reports by user" })
  @ApiQuery({ name: "userId", required: false, description: "User ID filter (use 'all' for all users)" })
  @ApiQuery({ name: "days", required: false, description: "Number of days to look back", type: Number })
  @ApiResponse({ status: 200, description: "SLA reports data", type: [Object] })
  async getSLAReports(
    @Query("userId") userId?: string,
    @Query("days") days?: string,
  ): Promise<SLAReport[]> {
    const daysNum = days ? parseInt(days, 10) : 30;
    if (daysNum < 1 || daysNum > 365) {
      throw new BadRequestException("Days must be between 1 and 365");
    }

    return this.reportsService.getSLAReports(userId, daysNum);
  }

  @Public()
  @Get("sla/export")
  @ApiOperation({ summary: "Export SLA report" })
  @ApiQuery({ name: "userId", required: false, description: "User ID filter" })
  @ApiQuery({ name: "days", required: false, description: "Number of days", type: Number })
  @ApiQuery({ name: "format", required: false, enum: ["pdf", "excel"], description: "Export format" })
  @ApiResponse({ status: 200, description: "Exported report content", type: String })
  async exportSLAReport(
    @Query("userId") userId?: string,
    @Query("days") days?: string,
    @Query("format") format?: "pdf" | "excel",
  ): Promise<string> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const exportFormat = format || "pdf";

    if (daysNum < 1 || daysNum > 365) {
      throw new BadRequestException("Days must be between 1 and 365");
    }

    return this.reportsService.exportSLAReport(userId, daysNum, exportFormat);
  }
}
