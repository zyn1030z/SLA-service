import { Body, Controller, Get, Inject, Param, Post, forwardRef } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { SlaCronJob } from "../scheduler/sla.cron";

@Controller()
export class SlaController {
  constructor(
    @Inject(forwardRef(() => SlaCronJob))
    private readonly slaCronJob: SlaCronJob
  ) {}

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

  /**
   * Chạy kiểm tra SLA violation thủ công
   */
  @Public()
  @Post("sla/check")
  async runSlaCheck() {
    return this.slaCronJob.runSlaCheck();
  }
}
