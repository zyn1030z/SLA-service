"use client";

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

const buildBackendUrl = (path: string) =>
  API_BASE_URL ? `${API_BASE_URL}${path}` : `/api${path}`;

const formatHoursToTime = (hours: number): string => {
  const totalSeconds = Math.abs(Math.round(hours * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
};

const formatDateTime = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

type RecentViolationRecord = {
  id: number;
  recordId: string;
  workflowName?: string | null;
  stepName?: string | null;
  stepCode?: string | null;
  violationCount: number;
  remainingHours?: number | null;
  startTime?: string | Date | null;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentViolations, setRecentViolations] = useState<
    RecentViolationRecord[]
  >([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const defaultSummary = {
      totalViolations: 0,
      activeRecords: 0,
      completedToday: 0,
      successRate: 0,
    };

    try {
      const [summaryResponse, recordsResponse] = await Promise.all([
        axios.get(buildBackendUrl("/dashboard/summary")).catch((error) => {
          console.error("Failed to load dashboard summary:", error);
          return null;
        }),
        fetch("/api/records?status=violated&pageSize=5").catch((error) => {
          console.error("Failed to load recent violations:", error);
          return null;
        }),
      ]);

      if (summaryResponse?.data) {
        setSummary(summaryResponse.data);
      } else {
        setSummary(defaultSummary);
      }

      if (recordsResponse && recordsResponse.ok) {
        const data = await recordsResponse.json();
        setRecentViolations(data.items || []);
      } else {
        setRecentViolations([]);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setSummary(defaultSummary);
      setRecentViolations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button onClick={fetchDashboardData}>{t("common.refresh")}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalViolations")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary?.totalViolations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.violationsDetected")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.activeRecords")}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.activeRecords ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.currentlyTracked")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.completedToday")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.completedToday ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.successfullyProcessed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.successRate")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.successRate ?? "95"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.slaComplianceRate")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentViolations")}</CardTitle>
            <CardDescription>{t("dashboard.latestViolations")}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentViolations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.noRecentViolations")}
              </p>
            ) : (
              <div className="space-y-4">
                {recentViolations.map((record) => {
                  const remaining = record.remainingHours ?? 0;
                  const isOverdue = remaining < 0;
                  const badgeLabel = isOverdue
                    ? `${formatHoursToTime(remaining)} ${t("records.overdue")}`
                    : `${formatHoursToTime(remaining)} ${t(
                        "records.remaining"
                      )}`;

                  return (
                    <div
                      key={record.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{record.recordId}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.workflowName || "-"}
                          {record.stepName
                            ? ` • ${record.stepName}`
                            : record.stepCode
                            ? ` • ${record.stepCode}`
                            : ""}
                        </p>
                        {record.startTime && (
                          <p className="text-xs text-muted-foreground">
                            {t("records.started")}:{" "}
                            {formatDateTime(record.startTime)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isOverdue ? "destructive" : "secondary"}
                        >
                          {badgeLabel}
                        </Badge>
                        <Badge variant="outline">
                          {t("records.violations")}: {record.violationCount}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.commonTasks")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/workflows">
              <Button className="w-full justify-start" variant="outline">
                {t("dashboard.viewAllWorkflows")}
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              {t("dashboard.exportReports")}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              {t("dashboard.configureSlaRules")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
