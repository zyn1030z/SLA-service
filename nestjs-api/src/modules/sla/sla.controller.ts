import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller()
export class SlaController {
  @Public()
  @Post("sla/start")
  async startSla(@Body() body: unknown) {
    // TODO: start tracking SLA
    return { ok: true };
  }

  @Public()
  @Post("sla/transition")
  async transition(@Body() body: unknown) {
    // TODO: transition to next step
    return { ok: true };
  }

  @Get("sla/status/:record_id")
  async getStatus(@Param("record_id") recordId: string) {
    // TODO: return tracking info
    return { recordId, status: "waiting" };
  }

  @Get("dashboard/summary")
  async dashboardSummary() {
    // TODO: aggregate stats
    return { totalViolations: 0 };
  }
}
