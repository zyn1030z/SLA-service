"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/lib/use-translation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";

export default function RecordsPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState<
    "none" | "workflow" | "step" | "status"
  >("none");

  const loadRecords = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchTerm) params.set("search", searchTerm);
    const res = await fetch(`/api/records?${params.toString()}`);
    const data = await res.json();
    setRecords(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter]);

  const filteredRecords = records.filter((record) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      record.recordId?.toLowerCase().includes(s) ||
      record.workflowName?.toLowerCase().includes(s) ||
      record.stepName?.toLowerCase().includes(s)
    );
  });

  const groupedRecords = useMemo(() => {
    if (groupBy === "none") {
      return [
        {
          label: null as string | null,
          items: filteredRecords,
        },
      ];
    }

    const labelMap = new Map<string, { label: string; items: any[] }>();

    const getLabel = (record: any) => {
      switch (groupBy) {
        case "workflow":
          return record.workflowName || t("records.groupUnknown");
        case "step":
          return (
            record.stepName || record.stepCode || t("records.groupUnknown")
          );
        case "status":
          if (record.status === "waiting") return t("records.waiting");
          if (record.status === "violated") return t("records.violated");
          if (record.status === "completed") return t("records.completed");
          return record.status || t("records.groupUnknown");
        default:
          return t("records.groupUnknown");
      }
    };

    filteredRecords.forEach((record) => {
      const label = getLabel(record);
      const key = `${groupBy}-${label}`;
      if (!labelMap.has(key)) {
        labelMap.set(key, { label, items: [] });
      }
      labelMap.get(key)!.items.push(record);
    });

    return Array.from(labelMap.values());
  }, [filteredRecords, groupBy, t]);

  const getStatusBadge = (status: string, violationCount: number) => {
    if (status === "completed") {
      return (
        <Badge variant="default" className="bg-green-600">
          {t("records.completed")}
        </Badge>
      );
    } else if (status === "violated" || violationCount > 0) {
      return <Badge variant="destructive">{t("records.violated")}</Badge>;
    } else {
      return <Badge variant="secondary">{t("records.waiting")}</Badge>;
    }
  };

  /**
   * Chuyển đổi số giờ (có thể là số thập phân) sang format HH:mm:ss
   */
  const formatHoursToTime = (hours: number): string => {
    const totalSeconds = Math.abs(Math.round(hours * 3600));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  };

  /**
   * Format date để hiển thị đúng như database (UTC, không bị timezone conversion)
   * Database lưu UTC: "2025-11-12 14:42:12+00"
   * Hiển thị: "2025-11-12 14:42:12" (giống database, không cộng thêm 7 giờ)
   */
  const formatDateTime = (dateInput: string | Date): string => {
    const date = new Date(dateInput);
    // Lấy UTC time trực tiếp, không bị ảnh hưởng bởi timezone của browser
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getRemainingTime = (remainingHours: number) => {
    if (remainingHours < 0) {
      const timeStr = formatHoursToTime(remainingHours);
      return (
        <span className="text-destructive font-medium">
          {timeStr} {t("records.overdue")}
        </span>
      );
    } else if (remainingHours === 0) {
      return (
        <span className="text-muted-foreground">{t("records.completed")}</span>
      );
    } else {
      const timeStr = formatHoursToTime(remainingHours);
      return (
        <span className="text-blue-600 font-medium">
          {timeStr} {t("records.remaining")}
        </span>
      );
    }
  };

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
            {t("records.title")}
          </h1>
          <p className="text-muted-foreground">{t("records.subtitle")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("records.searchRecords")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            {t("records.filter")}
          </Button>
          <Select
            value={groupBy}
            onValueChange={(value) =>
              setGroupBy(value as "none" | "workflow" | "step" | "status")
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("records.groupBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("records.groupNone")}</SelectItem>
              <SelectItem value="workflow">
                {t("records.groupWorkflow")}
              </SelectItem>
              <SelectItem value="step">{t("records.groupStep")}</SelectItem>
              <SelectItem value="status">{t("records.groupStatus")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">{t("records.allRecords")}</TabsTrigger>
          <TabsTrigger value="waiting">{t("records.waiting")}</TabsTrigger>
          <TabsTrigger value="violated">{t("records.violated")}</TabsTrigger>
          <TabsTrigger value="completed">{t("records.completed")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("records.totalRecords")}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{records.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t("records.totalRecords")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("records.waiting")}
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {records.filter((r) => r.status === "waiting").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("records.pendingApproval")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("records.violated")}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {records.filter((r) => r.status === "violated").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("records.slaViolations")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("records.completed")}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {records.filter((r) => r.status === "completed").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("records.successfullyProcessed")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("records.recordDetails")}</CardTitle>
              <CardDescription>{t("records.detailedView")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("records.recordId")}</TableHead>
                    <TableHead>{t("records.workflow")}</TableHead>
                    <TableHead>{t("records.currentStep")}</TableHead>
                    <TableHead>{t("records.status")}</TableHead>
                    <TableHead>{t("records.violations")}</TableHead>
                    <TableHead>{t("records.timeRemaining")}</TableHead>
                    <TableHead>{t("records.started")}</TableHead>
                    <TableHead>{t("records.approvers")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRecords.map((group) => (
                    <React.Fragment key={group.label ?? "all"}>
                      {group.label && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {group.label}
                          </TableCell>
                        </TableRow>
                      )}
                      {group.items.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.recordId}
                          </TableCell>
                          <TableCell>{record.workflowName}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.stepName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {record.stepCode}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              record.status,
                              record.violationCount
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.violationCount > 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {record.violationCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getRemainingTime(record.remainingHours)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(record.startTime)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {Array.isArray(record.userApprove) &&
                            record.userApprove.length > 0
                              ? record.userApprove
                                  .map((u: any) => u.name || u.login || u.id)
                                  .join(", ")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {total > 0
                ? `Hiển thị ${(page - 1) * pageSize + 1}-${Math.min(
                    page * pageSize,
                    total
                  )} / ${total}`
                : "Không có bản ghi"}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => (p * pageSize < total ? p + 1 : p))
                }
                disabled={page * pageSize >= total}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="waiting">
          <Card>
            <CardHeader>
              <CardTitle>{t("records.waitingRecords")}</CardTitle>
              <CardDescription>{t("records.recordsWaiting")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("records.recordId")}</TableHead>
                    <TableHead>{t("records.workflow")}</TableHead>
                    <TableHead>{t("records.currentStep")}</TableHead>
                    <TableHead>{t("records.timeRemaining")}</TableHead>
                    <TableHead>{t("records.started")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter((r) => r.status === "waiting")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.recordId}
                        </TableCell>
                        <TableCell>{record.workflowName}</TableCell>
                        <TableCell>{record.stepName}</TableCell>
                        <TableCell>
                          {getRemainingTime(record.remainingHours)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(record.startTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violated">
          <Card>
            <CardHeader>
              <CardTitle>{t("records.violatedRecords")}</CardTitle>
              <CardDescription>{t("records.recordsExceeded")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("records.recordId")}</TableHead>
                    <TableHead>{t("records.workflow")}</TableHead>
                    <TableHead>{t("records.currentStep")}</TableHead>
                    <TableHead>{t("records.violations")}</TableHead>
                    <TableHead>{t("records.overdueTime")}</TableHead>
                    <TableHead>{t("records.started")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter((r) => r.status === "violated")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.recordId}
                        </TableCell>
                        <TableCell>{record.workflowName}</TableCell>
                        <TableCell>{record.stepName}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {record.violationCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatHoursToTime(record.remainingHours)}{" "}
                          {t("records.overdue")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(record.startTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>{t("records.completedRecords")}</CardTitle>
              <CardDescription>{t("records.recordsProcessed")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("records.recordId")}</TableHead>
                    <TableHead>{t("records.workflow")}</TableHead>
                    <TableHead>{t("records.finalStep")}</TableHead>
                    <TableHead>{t("records.completed")}</TableHead>
                    <TableHead>{t("records.duration")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords
                    .filter((r) => r.status === "completed")
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.recordId}
                        </TableCell>
                        <TableCell>{record.workflowName}</TableCell>
                        <TableCell>{record.stepName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(record.startTime)}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {t("records.withinSla")}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
