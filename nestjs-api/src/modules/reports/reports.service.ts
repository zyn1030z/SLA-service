import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual } from "typeorm";
import { RecordEntity } from "../../entities/record.entity";

export interface SLAReport {
  userId: number;
  userName: string;
  userLogin: string;
  totalRecords: number;
  completedRecords: number;
  violatedRecords: number;
  pendingRecords: number;
  successRate: number;
  avgCompletionTime: number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(RecordEntity)
    private recordRepository: Repository<RecordEntity>,
  ) {}

  async getSLAReports(userId?: string, days: number = 30): Promise<SLAReport[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query tất cả records trong khoảng thời gian
    const recordsQuery = this.recordRepository
      .createQueryBuilder("r")
      .select([
        "r.id",
        "r.user_approve",
        "r.status",
        "r.created_at",
        "r.updated_at",
        "r.start_time"
      ])
      .where("r.created_at >= :startDate", { startDate });

    if (userId && userId !== "all") {
      // Filter theo user ID nếu được chỉ định
      recordsQuery.andWhere("r.user_approve::text LIKE :userId", {
        userId: `%${userId}%`
      });
    }

    const records = await recordsQuery.getRawMany();

    // Group records theo user
    const userReports = new Map<string, {
      userId: number;
      userName: string;
      userLogin: string;
      records: any[];
    }>();

    for (const record of records) {
      const userApproveData = record.user_approve;
      if (userApproveData && Array.isArray(userApproveData)) {
        for (const user of userApproveData) {
          const userKey = `${user.id}_${user.login}`;

          if (!userReports.has(userKey)) {
            userReports.set(userKey, {
              userId: user.id,
              userName: user.name,
              userLogin: user.login,
              records: []
            });
          }

          userReports.get(userKey)!.records.push(record);
        }
      }
    }

    // Tính toán báo cáo cho từng user
    const reports: SLAReport[] = [];

    for (const [userKey, userData] of userReports) {
      const userRecords = userData.records;

      const totalRecords = userRecords.length;
      const completedRecords = userRecords.filter(r => r.r_status === "completed").length;
      const violatedRecords = userRecords.filter(r => r.r_status === "violated").length;
      const pendingRecords = userRecords.filter(r => r.r_status === "waiting").length;

      const successRate = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0;

      // Tính thời gian hoàn thành trung bình
      const completedRecordsWithTime = userRecords.filter(r =>
        r.r_status === "completed" &&
        r.r_created_at &&
        r.r_updated_at
      );

      let avgCompletionTime = 0;
      if (completedRecordsWithTime.length > 0) {
        const totalTime = completedRecordsWithTime.reduce((sum, r) => {
          const created = new Date(r.r_created_at);
          const updated = new Date(r.r_updated_at);
          const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + diffHours;
        }, 0);
        avgCompletionTime = totalTime / completedRecordsWithTime.length;
      }

      reports.push({
        userId: userData.userId,
        userName: userData.userName,
        userLogin: userData.userLogin,
        totalRecords,
        completedRecords,
        violatedRecords,
        pendingRecords,
        successRate,
        avgCompletionTime
      });
    }

    // Sort theo tên user
    return reports.sort((a, b) => a.userName.localeCompare(b.userName));
  }

  async exportSLAReport(userId?: string, days: number = 30, format: "pdf" | "excel" = "pdf"): Promise<string> {
    const reports = await this.getSLAReports(userId, days);

    // Tạo báo cáo dạng text (trong thực tế sẽ tạo PDF/Excel)
    let report = `BÁO CÁO SLA - ${new Date().toLocaleDateString('vi-VN')}\n\n`;
    report += `Thời gian: ${days} ngày\n`;
    report += `Người dùng: ${userId === "all" || !userId ? "Tất cả" : `User ID: ${userId}`}\n\n`;

    report += `TÓM TẮT HIỆU SUẤT SLA:\n\n`;
    report += `┌─────────────────┬─────────┬─────────────┬─────────────┐\n`;
    report += `│ Người dùng      │ Tổng    │ Hoàn thành  │ Tỷ lệ (%)   │\n`;
    report += `├─────────────────┼─────────┼─────────────┼─────────────┤\n`;

    for (const user of reports) {
      report += `│ ${user.userName.padEnd(15)} │ ${user.totalRecords.toString().padStart(7)} │ ${user.completedRecords.toString().padStart(11)} │ ${user.successRate.toString().padStart(11)} │\n`;
    }

    report += `└─────────────────┴─────────┴─────────────┴─────────────┘\n\n`;

    const totalRecords = reports.reduce((sum, r) => sum + r.totalRecords, 0);
    const totalCompleted = reports.reduce((sum, r) => sum + r.completedRecords, 0);
    const overallSuccessRate = totalRecords > 0 ? Math.round((totalCompleted / totalRecords) * 100) : 0;

    report += `Tổng kết:\n`;
    report += `- Tổng số bản ghi: ${totalRecords}\n`;
    report += `- Tổng hoàn thành: ${totalCompleted}\n`;
    report += `- Tỷ lệ thành công: ${overallSuccessRate}%\n\n`;

    report += `Chi tiết vi phạm SLA:\n`;
    for (const user of reports) {
      if (user.violatedRecords > 0) {
        report += `- ${user.userName}: ${user.violatedRecords} vi phạm\n`;
      }
    }

    report += `\nThời gian tạo báo cáo: ${new Date().toLocaleString('vi-VN')}\n`;

    return report;
  }
}
