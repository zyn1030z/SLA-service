import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios, { AxiosInstance } from "axios";
import { ActivityEntity } from "../../entities/activity.entity";
import { RecordEntity } from "../../entities/record.entity";
import { WorkflowEntity } from "../../entities/workflow.entity";

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>
  ) {
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  /**
   * Gửi thông báo vi phạm SLA đến Odoo
   */
  async sendNotification(
    record: RecordEntity,
    activity: ActivityEntity
  ): Promise<boolean> {
    // Lấy config từ activity, nếu không có thì fallback về workflow
    let config = activity.notifyApiConfig;
    if (!config) {
      if (!record.workflowId) {
        this.logger.warn(
          `No notification API config on activity ${activity.id} and record has no workflowId to fallback`
        );
        return false;
      }
      const workflow = await this.workflowRepository.findOne({
        where: { id: record.workflowId },
      });
      config = workflow?.notifyApiConfig || null;
      if (!config) {
        this.logger.warn(
          `No notification API config found for activity ${activity.id} and workflow ${record.workflowId}`
        );
        return false;
      }
    }

    try {
      const body = this.replaceVariables(config.body || {}, record, activity);

      const response = await this.axiosInstance.request({
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: body,
      });

      this.logger.log(
        `Notification sent successfully for record ${record.recordId}`
      );
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      this.logger.error(
        `Failed to send notification for record ${record.recordId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Gửi yêu cầu phê duyệt tự động đến Odoo
   */
  async sendAutoApproval(
    record: RecordEntity,
    activity: ActivityEntity,
    violationCount: number
  ): Promise<boolean> {
    if (!activity.autoApproveApiConfig) {
      this.logger.warn(
        `No auto-approval API config for activity ${activity.id}`
      );
      return false;
    }

    try {
      const config = activity.autoApproveApiConfig;
      const approvalType = config.approvalType || "single";

      // Chọn config dựa trên loại phê duyệt
      const apiConfig =
        approvalType === "single"
          ? config.singleApprovalConfig
          : config.multipleApprovalConfig;

      if (!apiConfig) {
        this.logger.warn(
          `No ${approvalType} approval config for activity ${activity.id}`
        );
        return false;
      }

      const body = this.replaceVariables(
        apiConfig.body || {},
        record,
        activity,
        violationCount,
        approvalType
      );

      const response = await this.axiosInstance.request({
        url: apiConfig.url,
        method: apiConfig.method,
        headers: apiConfig.headers,
        data: body,
      });

      this.logger.log(
        `Auto-approval sent successfully for record ${record.recordId} (${approvalType})`
      );
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      this.logger.error(
        `Failed to send auto-approval for record ${record.recordId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Thay thế các biến trong template
   */
  private replaceVariables(
    template: Record<string, any>,
    record: RecordEntity,
    activity: ActivityEntity,
    violationCount?: number,
    approvalType?: string
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === "string") {
        result[key] = value
          .replace(/{stepId}/g, String(activity.id))
          .replace(/{stepName}/g, activity.name || "")
          .replace(/{stepCode}/g, activity.code || "")
          .replace(/{recordId}/g, record.recordId)
          .replace(
            /{violationCount}/g,
            String(violationCount || record.violationCount)
          )
          .replace(/{slaHours}/g, String(activity.slaHours || record.slaHours))
          .replace(/{timestamp}/g, new Date().toISOString())
          .replace(/{approvalType}/g, approvalType || "")
          .replace(/{approvalCount}/g, String(violationCount || 0))
          .replace(/{workflowId}/g, String(record.workflowId || ""))
          .replace(/{workflowName}/g, record.workflowName || "")
          .replace(/{model}/g, record.model || "");
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.replaceVariables(
          value as Record<string, any>,
          record,
          activity,
          violationCount,
          approvalType
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
