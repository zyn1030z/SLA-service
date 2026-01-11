"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ExternalLink,
  FileX
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type MetricType = "violations" | "active" | "completed" | "success" | null;

export default function DashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentViolations, setRecentViolations] = useState<
    RecentViolationRecord[]
  >([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
  const [metricRecords, setMetricRecords] = useState<any[]>([]);
  const [metricLoading, setMetricLoading] = useState(false);

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
        fetch("/api/dashboard/summary").catch((error) => {
          console.error("Failed to load dashboard summary:", error);
          return null;
        }),
        fetch("/api/records?status=violated&pageSize=5").catch((error) => {
          console.error("Failed to load recent violations:", error);
          return null;
        }),
      ]);

      if (summaryResponse && summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
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

  const fetchMetricRecords = useCallback(async (metricType: MetricType) => {
    if (!metricType) return;

    setMetricLoading(true);
    try {
      // For 'active' metric we want both waiting + violated records
      if (metricType === "active") {
        const pageSizeParam = "pageSize=20";
        const [waitingRes, violatedRes] = await Promise.all([
          fetch(`/api/records?status=waiting&${pageSizeParam}`),
          fetch(`/api/records?status=violated&${pageSizeParam}`),
        ]);

        const waitingJson = waitingRes && waitingRes.ok ? await waitingRes.json() : { items: [] };
        const violatedJson = violatedRes && violatedRes.ok ? await violatedRes.json() : { items: [] };

        const waitingItems = Array.isArray(waitingJson.items) ? waitingJson.items : [];
        const violatedItems = Array.isArray(violatedJson.items) ? violatedJson.items : [];

        // Merge and deduplicate by recordId or id
        const combined = [...waitingItems, ...violatedItems];
        const uniqueById: Record<string, any> = {};
        combined.forEach((r: any) => {
          const key = String(r.recordId ?? r.id ?? JSON.stringify(r));
          if (!uniqueById[key]) uniqueById[key] = r;
        });

        setMetricRecords(Object.values(uniqueById));
      } else {
        let url = "/api/records?pageSize=10";

        switch (metricType) {
          case "violations":
            url += "&status=violated";
            break;
          case "completed":
            // For completed today, get more recent completed records to filter by today
            url += "&status=completed&pageSize=20";
            break;
          case "success":
            // For success rate, show all records
            url += "";
            break;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          let filteredRecords = data.items || [];

          // For completed today, filter by today's date
          if (metricType === "completed") {
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
            filteredRecords = filteredRecords.filter((record: any) => {
              if (!record.updatedAt) return false;
              const recordDate = new Date(record.updatedAt).toISOString().split("T")[0];
              return recordDate === todayStr;
            });
          }

          setMetricRecords(filteredRecords);
        } else {
          setMetricRecords([]);
        }
      }
    } catch (error) {
      console.error("Error loading metric records:", error);
      setMetricRecords([]);
    } finally {
      setMetricLoading(false);
    }
  }, []);

  const handleMetricClick = (metricType: MetricType) => {
    if (selectedMetric === metricType) {
      // If clicking the same metric, close it
      setSelectedMetric(null);
      setMetricRecords([]);
    } else {
      // Open new metric
      setSelectedMetric(metricType);
      fetchMetricRecords(metricType);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "waiting":
        return "Đang chờ";
      case "violated":
        return "Vi phạm";
      case "completed":
        return "Hoàn thành";
      case "processing":
        return "Đang xử lý";
      case "cancelled":
        return "Đã huỷ";
      case "success":
        return "Thành công";
      default:
        return status;
    }
  };

  // Simple inline SVG chart for SLA Performance Trend (no extra deps)
  const SLAChart = ({ points }: { points: number[] }) => {
    const width = 720;
    const height = 160;
    const padding = 24;
    const max = Math.max(...points, 100);
    const min = Math.min(...points, 0);
    const range = Math.max(1, max - min);

    const xForIndex = (i: number) =>
      padding + (i / Math.max(1, points.length - 1)) * (width - padding * 2);
    const yForValue = (v: number) =>
      padding + (1 - (v - min) / range) * (height - padding * 2);

    const pathD =
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xForIndex(i)} ${yForValue(p)}`)
        .join(" ") || "";

    const areaD =
      points.length > 0
        ? `${points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xForIndex(i)} ${yForValue(p)}`)
            .join(" ")} L ${xForIndex(points.length - 1)} ${height - padding} L ${xForIndex(0)} ${
            height - padding
          } Z`
        : "";

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
          <defs>
            <linearGradient id="slaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c7f9e5" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c7f9e5" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding + t * (height - padding * 2);
            return <line key={t} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#eee" />;
          })}

          {/* area */}
          <path d={areaD} fill="url(#slaGradient)" stroke="none" />
          {/* line */}
          <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {/* points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={xForIndex(i)} cy={yForValue(p)} r={3.5} fill="#4f46e5" />
            </g>
          ))}
        </svg>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          {points.map((_, i) => (
            <div key={i} className="text-center" style={{ width: `${100 / points.length}%` }}>
              {i === points.length - 1 ? "Hôm nay" : `-${points.length - i - 1}d`}
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <main className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts and Actions Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Violations Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
            selectedMetric === "violations" ? "ring-2 ring-red-500" : ""
          }`}
          onClick={() => handleMetricClick("violations")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
              {t("dashboard.totalViolations")}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <TrendingUp className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">
              {summary?.totalViolations ?? 0}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12%
              </Badge>
              <p className="text-xs text-red-600 dark:text-red-400">
                {t("dashboard.violationsDetected")}
              </p>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/20 rounded-full -mr-10 -mt-10" />
        </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
            selectedMetric === "active" ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleMetricClick("active")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
              {t("dashboard.activeRecords")}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {summary?.activeRecords ?? 0}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8%
              </Badge>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t("dashboard.currentlyTracked")}
              </p>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -mr-10 -mt-10" />
        </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
            selectedMetric === "completed" ? "ring-2 ring-green-500" : ""
          }`}
          onClick={() => handleMetricClick("completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
              {t("dashboard.completedToday")}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {summary?.completedToday ?? 0}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +15%
              </Badge>
              <p className="text-xs text-green-600 dark:text-green-400">
                {t("dashboard.successfullyProcessed")}
              </p>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 rounded-full -mr-10 -mt-10" />
        </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
            selectedMetric === "success" ? "ring-2 ring-purple-500" : ""
          }`}
          onClick={() => handleMetricClick("success")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">
              {t("dashboard.successRate")}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {summary?.successRate ?? "95"}%
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -2%
              </Badge>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {t("dashboard.slaComplianceRate")}
              </p>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/20 rounded-full -mr-10 -mt-10" />
        </Card>
      </div>

      {/* Metric Records Section */}
      {selectedMetric && (
        <Card className="animate-in slide-in-from-top-5 duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedMetric === "violations" && (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-red-700 dark:text-red-400">
                      {t("dashboard.totalViolations")} ({metricRecords.length})
                    </CardTitle>
                  </>
                )}
                {selectedMetric === "active" && (
                  <>
                    <Activity className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-blue-700 dark:text-blue-400">
                      {t("dashboard.activeRecords")} ({metricRecords.length})
                    </CardTitle>
                  </>
                )}
                {selectedMetric === "completed" && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-green-700 dark:text-green-400">
                      {t("dashboard.completedToday")} ({metricRecords.length})
                    </CardTitle>
                  </>
                )}
                {selectedMetric === "success" && (
                  <>
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-purple-700 dark:text-purple-400">
                      {t("dashboard.allRecords")} ({metricRecords.length})
                    </CardTitle>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (selectedMetric === "violations") params.set("status", "violated");
                    else if (selectedMetric === "active") params.set("status", "waiting");
                    else if (selectedMetric === "completed") params.set("status", "completed");
                    window.location.href = `/records?${params.toString()}`;
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("dashboard.viewAllRecords")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMetric(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metricLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : metricRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID bản ghi Odoo</TableHead>
                      <TableHead>Quy trình</TableHead>
                      <TableHead>Bước hiện tại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Vi phạm</TableHead>
                      <TableHead>Bắt đầu</TableHead>
                      <TableHead>Người phê duyệt</TableHead>
                      <TableHead>Ngày đến hạn tiếp theo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricRecords.map((r: any) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => (window.location.href = `/records`)}>
                        <TableCell>{r.recordId ?? r.id}</TableCell>
                        <TableCell className="font-medium">{r.workflowName ?? r.name ?? "-"}</TableCell>
                        <TableCell>{r.stepName ?? r.currentStep ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "completed"
                                ? "default"
                                : r.status === "violated"
                                ? "destructive"
                                : r.status === "waiting"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {statusLabel(r.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.violationCount ?? r.violations ?? 0}</TableCell>
                        <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                        <TableCell>
                          {r.userApprove?.[0]?.name ?? r.approverName ?? "-"}
                          {r.approvedAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(r.approvedAt).toLocaleString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{r.nextDueAt ? new Date(r.nextDueAt).toLocaleString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                title={t("common.noData")}
                description={t("dashboard.noRecordsFound")}
                icon={<FileX className="h-12 w-12 text-muted-foreground" />}
              />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Performance Chart Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              SLA Performance Trend
            </CardTitle>
            <CardDescription>Last 7 days compliance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/10 p-4">
              {/* build simple 7-day trend from summary.successRate (fallback sample) */}
              <SLAChart
                points={
                  summary && Array.isArray(summary.trend)
                    ? summary.trend
                    : (() => {
                        const base = typeof summary?.successRate === "number" ? summary.successRate : 82;
                        return Array.from({ length: 7 }).map((_, i) =>
                          Math.max(0, Math.min(100, Math.round(base + Math.sin(i) * 3 - i * 0.5)))
                        );
                      })()
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("dashboard.quickActions")}
            </CardTitle>
            <CardDescription>{t("dashboard.commonTasks")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/records">
              <Button className="w-full justify-start group" variant="outline">
                <FileText className="h-4 w-4 mr-3 group-hover:text-primary transition-colors" />
                {t("dashboard.viewAllWorkflows")}
              </Button>
            </Link>
            <Link href="/workflows">
              <Button className="w-full justify-start group" variant="outline">
                <Activity className="h-4 w-4 mr-3 group-hover:text-primary transition-colors" />
                {t("dashboard.viewAllWorkflows")}
              </Button>
            </Link>
            <Button className="w-full justify-start group" variant="outline">
              <BarChart3 className="h-4 w-4 mr-3 group-hover:text-primary transition-colors" />
              {t("dashboard.exportReports")}
            </Button>
            <Button className="w-full justify-start group" variant="outline">
              <Users className="h-4 w-4 mr-3 group-hover:text-primary transition-colors" />
              {t("dashboard.configureSlaRules")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Violations */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t("dashboard.recentViolations")}
              </CardTitle>
              <CardDescription>{t("dashboard.latestViolations")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/records?status=violated">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Xem tất cả bản ghi
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMetric(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentViolations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {t("dashboard.noRecentViolations")}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                All SLA requirements are being met. Great job!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID bản ghi Odoo</TableHead>
                    <TableHead>Quy trình</TableHead>
                    <TableHead>Bước hiện tại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Vi phạm</TableHead>
                    <TableHead>Bắt đầu</TableHead>
                    <TableHead>Người phê duyệt</TableHead>
                    <TableHead>Ngày đến hạn tiếp theo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentViolations.slice(0, 3).map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => (window.location.href = `/records`)}>
                      <TableCell className="font-medium">{r.recordId ?? r.id}</TableCell>
                      <TableCell>{r.workflowName ?? r.workflow ?? "-"}</TableCell>
                      <TableCell>{r.stepName ?? r.currentStep ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "completed"
                              ? "default"
                              : r.status === "violated"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {statusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.violationCount ?? r.violations ?? 0}</TableCell>
                      <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                      <TableCell>{r.userApprove?.[0]?.name ?? r.approverName ?? "-"}</TableCell>
                      <TableCell>{r.nextDueAt ? new Date(r.nextDueAt).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
