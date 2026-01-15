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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  activityName?: string | null;
  actionType: ActionType;
  violationCount: number;
  isSuccess: boolean;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  assignees?: Array<{
    id: number;
    name: string;
    login: string;
  }>;
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
  
  // Filters
  const [actionType, setActionType] = useState<"" | ActionType>("");
  const [isSuccess, setIsSuccess] = useState<"all" | "true" | "false">("all");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedLog, setSelectedLog] = useState<SlaActionLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (actionType) params.set("actionType", actionType);
    if (searchTerm) params.set("search", searchTerm);
    if (isSuccess !== "all") params.set("isSuccess", isSuccess);
    if (userSearchTerm) params.set("assignee", userSearchTerm);

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
  }, [page, pageSize, actionType, searchTerm, isSuccess, userSearchTerm]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(searchInput.trim());
    setUserSearchTerm(userSearch.trim());
  };
  
  // Also trigger search when filters change directly (selects)
  const handleFilterChange = (
      newActionType?: "" | ActionType, 
      newIsSuccess?: "all" | "true" | "false"
  ) => {
      setPage(1);
      if (newActionType !== undefined) setActionType(newActionType);
      if (newIsSuccess !== undefined) setIsSuccess(newIsSuccess);
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
    <main className="p-6 max-w-[1600px] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("slaLogs.title")}
          </h1>
          <p className="text-muted-foreground">{t("slaLogs.subtitle")}</p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-background">
        <div className="p-1">
          {/* Toolbar */}
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center p-4 rounded-lg bg-card border mb-4">
            
            {/* Search - Primary Action */}
            <div className="relative w-full xl:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("slaLogs.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="pl-9 bg-background"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto items-center">
              
               {/* User Filter */}
               <div className="relative w-full sm:w-48">
                  <Input
                    placeholder="Người dùng..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="pl-3 bg-background"
                  />
               </div>

              {/* Status Filter */}
              <Select
                value={isSuccess}
                onValueChange={(value) => handleFilterChange(undefined, value as "all" | "true" | "false")}
              >
                <SelectTrigger className="w-full sm:w-[140px] bg-background">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="true">
                    <span className="flex items-center text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                      {t("slaLogs.successYes")}
                    </span>
                  </SelectItem>
                  <SelectItem value="false">
                     <span className="flex items-center text-red-600">
                      <span className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                      {t("slaLogs.successNo")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

               {/* Action Type Filter */}
              <Select
                value={actionType || "all"}
                onValueChange={(value: string) => {
                  setPage(1);
                  setActionType(value === "all" ? "" : (value as ActionType));
                }}
              >
                <SelectTrigger className="w-full sm:w-[160px] bg-background">
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

              <Button variant="secondary" onClick={handleSearch} className="whitespace-nowrap w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                {t("slaLogs.applyFilters")}
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">{t("slaLogs.emptyState")}</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Không tìm thấy kết quả nào phù hợp với bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc bộ lọc.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px] uppercase text-xs font-bold tracking-wider text-muted-foreground pl-4">{t("slaLogs.id")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground">{t("slaLogs.user")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground">{t("slaLogs.workflow")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground">{t("slaLogs.activity")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground">{t("slaLogs.type")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground text-center">{t("slaLogs.violation")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground text-center">{t("slaLogs.status")}</TableHead>
                      <TableHead className="uppercase text-xs font-bold tracking-wider text-muted-foreground text-right pr-4">{t("slaLogs.time")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                        onClick={() => setSelectedLog(log)}
                      >
                         <TableCell className="font-medium pl-4 text-primary">
                          #{log.recordId}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {log.assignees && log.assignees.length > 0 ? (
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {log.assignees[0].name}
                                </span>
                                {log.assignees.length > 1 && (
                                     <span className="text-xs text-muted-foreground">
                                        + {log.assignees.length - 1} người khác
                                     </span>
                                )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {log.workflowName ?? log.workflowId ?? "-"}
                        </TableCell>
                         <TableCell className="text-sm text-muted-foreground">
                             {log.activityName ?? log.activityId ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-normal ${
                                log.actionType === "notify" 
                                ? "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-50" 
                                : "border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-50"
                            }`}
                          >
                            {log.actionType === "notify"
                              ? t("slaLogs.notify")
                              : t("slaLogs.autoApprove")}
                          </Badge>
                        </TableCell>
                         <TableCell className="text-center">
                             {log.violationCount > 0 ? (
                                 <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                                     {log.violationCount}
                                 </span>
                             ) : (
                                 <span className="text-muted-foreground">-</span>
                             )}
                        </TableCell>
                        <TableCell className="text-center">
                            {log.isSuccess ? (
                                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
                                    {t("slaLogs.successYes")}
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="items-center gap-1">
                                    {t("slaLogs.successNo")}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm tabular-nums pr-4">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination footer */}
            {logs.length > 0 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                     Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, total)}</span> of <span className="font-medium">{total}</span> results
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
            )}
          </CardContent>
        </div>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Chi tiết Log</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                 {/* ID and Status */}
                 <div className="col-span-2 flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID Mẫu tin</p>
                        <p className="text-lg font-bold">#{selectedLog.recordId}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Trạng thái</p>
                         <Badge variant={selectedLog.isSuccess ? "default" : "destructive"}>
                             {selectedLog.isSuccess ? "Thành công" : "Thất bại"}
                         </Badge>
                    </div>
                 </div>

                 {/* Key Details */}
                 <div className="space-y-1">
                     <p className="text-xs text-muted-foreground font-medium">Quy trình</p>
                     <p className="text-sm font-medium">{selectedLog.workflowName ?? "-"}</p>
                 </div>
                 
                 <div className="space-y-1">
                     <p className="text-xs text-muted-foreground font-medium">Hoạt động</p>
                     <p className="text-sm font-medium">{selectedLog.activityName ?? selectedLog.activityId ?? "-"}</p>
                 </div>

                 <div className="space-y-1">
                     <p className="text-xs text-muted-foreground font-medium">Hành động</p>
                     <p className="text-sm">{selectedLog.actionType === "notify" ? "Gửi thông báo" : "Tự động duyệt"}</p>
                 </div>

                 <div className="space-y-1">
                     <p className="text-xs text-muted-foreground font-medium">Thời gian chạy</p>
                     <p className="text-sm font-mono">{formatDateTime(selectedLog.createdAt)}</p>
                 </div>

                 {/* Message Block */}
                 <div className="col-span-2 space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Thông điệp hệ thống</p>
                    <div className="bg-slate-50 border rounded-md p-3 text-sm text-slate-600 font-mono break-words">
                        {translateMessage(selectedLog.message) || "Không có thông điệp"}
                    </div>
                 </div>
                 
                 {/* Assignees List */}
                 <div className="col-span-2 space-y-2 mt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Người xử lý ({selectedLog.assignees?.length || 0})</p>
                    {selectedLog.assignees && selectedLog.assignees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedLog.assignees.slice(0, 6).map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-2 border rounded-md bg-background">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.login}</p>
                              </div>
                            </div>
                          ))}
                          {selectedLog.assignees.length > 6 && (
                              <div className="flex items-center justify-center text-xs text-muted-foreground p-2">
                                  + {selectedLog.assignees.length - 6} người khác...
                              </div>
                          )}
                        </div>
                    ) : (
                         <p className="text-sm text-muted-foreground italic">Không tìm thấy thông tin.</p>
                    )}
                 </div>
              </div>
            </div>
          )}
          
          <div className="p-4 border-t bg-muted/10 flex justify-end">
             <Button variant="outline" onClick={() => setSelectedLog(null)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SlaActionLogsPage;
