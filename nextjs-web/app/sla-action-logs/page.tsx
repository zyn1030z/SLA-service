"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/use-translation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Filter } from "lucide-react";

type ActionType = "notify" | "auto_approve";

interface SlaActionLog {
  id: string;
  recordId: string;
  workflowId: number | null;
  workflowName?: string | null;
  activityId: number | null;
  actionType: ActionType;
  violationCount: number;
  isSuccess: boolean;
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  items: SlaActionLog[];
  total: number;
  page: number;
  pageSize: number;
}

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

const SlaActionLogsPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<SlaActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [actionType, setActionType] = useState<"" | ActionType>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (actionType) params.set("actionType", actionType);
    if (searchTerm) params.set("search", searchTerm);

      try {
      const res = await fetch(`/api/sla-action-logs?${params.toString()}`);
      const data: ApiResponse = await res.json();
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load SLA action logs:", error);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionType, searchTerm]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const translateMessage = (msg: string | null) => {
    if (!msg) return "-";
    // Map backend English messages to Vietnamese for legacy logs
    switch (msg.trim()) {
      case "Notification API not configured or request failed":
        return "Gửi thông báo vi phạm: API không được cấu hình hoặc yêu cầu thất bại";
      default:
        return msg;
    }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("slaLogs.title")}
          </h1>
          <p className="text-muted-foreground">{t("slaLogs.subtitle")}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("slaLogs.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="pl-8"
            />
          </div>
          <Button variant="default" onClick={handleSearch} className="md:ml-2">
            <Filter className="h-4 w-4 mr-2" />
            {t("slaLogs.applyFilters")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{t("slaLogs.listTitle")}</CardTitle>
            <CardDescription>{t("slaLogs.listSubtitle")}</CardDescription>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Select
              value={actionType || "all"}
              onValueChange={(value) => {
                setPage(1);
                setActionType(value === "all" ? "" : (value as ActionType));
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("slaLogs.actionType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("slaLogs.allTypes")}</SelectItem>
                <SelectItem value="notify">{t("slaLogs.notify")}</SelectItem>
                <SelectItem value="auto_approve">
                  {t("slaLogs.autoApprove")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {t("slaLogs.emptyState")}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.recordId")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.workflowName")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.activityId")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.actionType")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.violationCount")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.success")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.message")}</TableHead>
                    <TableHead className="whitespace-nowrap">{t("slaLogs.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className={log.isSuccess ? "bg-green-50" : "bg-red-50"}
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {log.recordId}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.workflowName ?? log.workflowId ?? "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{log.activityId ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={
                            log.actionType === "notify"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {log.actionType === "notify"
                            ? t("slaLogs.notify")
                            : t("slaLogs.autoApprove")}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{log.violationCount}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant={log.isSuccess ? "default" : "destructive"}
                        >
                          {log.isSuccess
                            ? t("slaLogs.successYes")
                            : t("slaLogs.successNo")}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="max-w-2xl truncate"
                        title={translateMessage(log.message) || "-"}
                      >
                        {translateMessage(log.message) || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {total > 0
                    ? `${t("slaLogs.paginationPrefix")} ${
                        (page - 1) * pageSize + 1
                      }-${Math.min(page * pageSize, total)} / ${total}`
                    : t("slaLogs.emptyState")}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    {t("slaLogs.prevPage")}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((prev) => (prev < totalPages ? prev + 1 : prev))
                    }
                    disabled={page >= totalPages}
                  >
                    {t("slaLogs.nextPage")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default SlaActionLogsPage;
