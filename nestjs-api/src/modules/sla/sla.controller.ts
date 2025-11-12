import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Public } from "../auth/public.decorator";
import { SlaCronJob } from "../scheduler/sla.cron";
import { RecordEntity } from "../../entities/record.entity";

@Controller()
export class SlaController {
  constructor(
    @Inject(forwardRef(() => SlaCronJob))
    private readonly slaCronJob: SlaCronJob,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>
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

  @Public()
  @Get("dashboard/summary")
  async dashboardSummary() {
    // Tổng số bản ghi vi phạm
    const totalViolations = await this.recordRepository.count({
      where: { status: "violated" },
    });

    // Bản ghi đang hoạt động (đang theo dõi): waiting + violated
    const waitingCount = await this.recordRepository.count({
      where: { status: "waiting" },
    });
    const activeRecords = waitingCount + totalViolations;

    // Hoàn thành hôm nay (theo updated_at trong ngày hiện tại - UTC)
    const now = new Date();
    const startOfDayUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );
    const endOfDayUtc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
    const completedToday = await this.recordRepository
      .createQueryBuilder("r")
      .where("r.status = :status", { status: "completed" })
      .andWhere("r.updated_at BETWEEN :start AND :end", {
        start: startOfDayUtc.toISOString(),
        end: endOfDayUtc.toISOString(),
      })
      .getCount();

    // Tỷ lệ thành công: % bản ghi completed trên tổng tất cả bản ghi
    const totalRecords = await this.recordRepository.count();
    const completedCount = await this.recordRepository.count({
      where: { status: "completed" },
    });
    const successRate =
      totalRecords > 0 ? Math.round((completedCount / totalRecords) * 100) : 0;

    return {
      totalViolations,
      activeRecords,
      completedToday,
      successRate,
    };
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
