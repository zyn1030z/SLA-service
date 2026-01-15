"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function RecordsPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(0);
  const [countAll, setCountAll] = useState<number>(0);
  const [countWaiting, setCountWaiting] = useState<number>(0);
  const [countViolated, setCountViolated] = useState<number>(0);
  const [countCompleted, setCountCompleted] = useState<number>(0);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [stepFilter, setStepFilter] = useState<string | null>(null);
  const [stepOptions, setStepOptions] = useState<string[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<any[]>([]);
  const [workflowFilter, setWorkflowFilter] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string>("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/records?page=${page}&pageSize=${pageSize}`;
      if (selectedReport && selectedReport !== "all") {
        url += `&status=${encodeURIComponent(selectedReport)}`;
      }
      if (stepFilter && stepFilter !== "all") {
        url += `&step=${encodeURIComponent(stepFilter)}`;
      }
      if (workflowFilter) {
        url += `&workflowId=${encodeURIComponent(workflowFilter)}`;
      }
      if (searchDebounced) {
        url += `&search=${encodeURIComponent(searchDebounced)}`;
      }
      if (groupBy && groupBy !== "none") {
        url += `&group=${encodeURIComponent(groupBy)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
      const data = await res.json();
      setRecords(data.items || []);
        const totalCount = data.total ?? (data.items ? data.items.length : 0);
        setTotal(totalCount);
        // Do not overwrite global `countAll` when loading filtered/paged data.
        // `countAll` should reflect the overall total across all statuses and is
        // loaded via `loadCounts()`. Overwriting it here causes the "Tổng bản ghi"
        // card to change when a report card is selected.
        if (!selectedReport || selectedReport === "all") {
          setCountAll(totalCount);
        }
      } else {
        setRecords([]);
        setTotal(0);
      }
    } catch (error) {
      console.error("Failed to load records:", error);
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedReport, searchDebounced, groupBy, stepFilter, workflowFilter]);

  // load counts for cards (counts across all pages) respecting current filters except pagination
  const loadCounts = useCallback(async () => {
    try {
      const baseParams: string[] = [];
      if (stepFilter && stepFilter !== "all") baseParams.push(`step=${encodeURIComponent(String(stepFilter))}`);
      if (workflowFilter) baseParams.push(`workflowId=${encodeURIComponent(String(workflowFilter))}`);
      if (searchDebounced) baseParams.push(`search=${encodeURIComponent(searchDebounced)}`);
      if (groupBy && groupBy !== "none") baseParams.push(`group=${encodeURIComponent(groupBy)}`);

      const buildUrl = (status?: string) => {
        const params = [...baseParams];
        if (status) params.push(`status=${encodeURIComponent(status)}`);
        // request a single item but let backend return total
        params.push(`page=1&pageSize=1`);
        return `/api/records?${params.join("&")}`;
      };

      const urls = {
        all: buildUrl(),
        waiting: buildUrl("waiting"),
        violated: buildUrl("violated"),
        completed: buildUrl("completed"),
      };

      const [allRes, waitingRes, violatedRes, completedRes] = await Promise.all([
        fetch(urls.all),
        fetch(urls.waiting),
        fetch(urls.violated),
        fetch(urls.completed),
      ]);

      const [allJson, waitingJson, violatedJson, completedJson] = await Promise.all([
        allRes.ok ? allRes.json() : null,
        waitingRes.ok ? waitingRes.json() : null,
        violatedRes.ok ? violatedRes.json() : null,
        completedRes.ok ? completedRes.json() : null,
      ]);

      const getCount = (data: any) => (data ? data.total ?? (Array.isArray(data.items) ? data.items.length : 0) : 0);

      const allCount = getCount(allJson);
      setCountAll(allCount);
      setTotal((prev) => (allCount)); // keep pagination total in sync
      setCountWaiting(getCount(waitingJson));
      setCountViolated(getCount(violatedJson));
      setCountCompleted(getCount(completedJson));
    } catch (err) {
      console.error("Failed to load counts:", err);
    }
  }, [stepFilter, workflowFilter, searchDebounced, groupBy]);

  // refresh counts when filters change
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);
  
  // fetch step options from backend
  // load workflows for workflow select
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/workflows");
        if (!res.ok) return;
        const data = await res.json();
        // backend may return { data: [...] } or array
        const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        if (mounted) setWorkflowOptions(list);
      } catch (err) {
        console.error("Failed to load workflows:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // fetch step options from backend, preferring workflow details when workflowFilter set
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (workflowFilter) {
          const wfRes = await fetch(`/api/workflows/${workflowFilter}`);
          if (wfRes.ok) {
            const wfJson = await wfRes.json();
            const wfData = wfJson?.data || wfJson;
            const activities =
              wfData?.odooData?.activities ||
              wfData?.odooData ||
              wfData?.activities ||
              [];
            const names = Array.isArray(activities)
              ? activities.map((a: any) => a.name).filter(Boolean)
              : [];
            if (mounted) setStepOptions(names);
            return;
          }
        }

        // fallback: use records/steps endpoint
        const url = "/api/records/steps";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const steps = Array.isArray(data) ? data : Array.isArray(data.steps) ? data.steps : [];
        if (mounted) setStepOptions(steps);
      } catch (err) {
        console.error("Failed to load step options:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [workflowFilter]);

  const handleReportClick = (reportType: string) => {
    setPage(1);
    setSelectedReport((prev) => (prev === reportType ? null : reportType));
  };

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Trigger reload when stepFilter changes (ensure immediate fetch)
  useEffect(() => {
    setPage(1);
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepFilter]);

  // Trigger reload when workflowFilter changes (reset page and fetch)
  useEffect(() => {
    setPage(1);
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowFilter]);

  // map status values to Vietnamese labels
  const statusLabel = (s?: string) => {
    if (!s) return "-";
    const map: Record<string, string> = {
      waiting: "Đang chờ",
      violated: "Vi phạm",
      completed: "Hoàn thành",
      processing: "Đang xử lý",
      cancelled: "Đã huỷ",
      success: "Thành công",
    };
    return map[s] ?? s;
  };

  

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("records.title")}</h1>
          <p className="text-muted-foreground">{t("records.subtitle")}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Input value={searchTerm} onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)} placeholder={"Tìm kiếm bản ghi..."} className="w-[320px]" />
          <Select onValueChange={(v) => setGroupBy(v)} value={groupBy ?? "none"}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Không nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không nhóm</SelectItem>
              <SelectItem value="system">Theo hệ thống</SelectItem>
              <SelectItem value="workflow">Theo quy trình</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setWorkflowFilter(v === "all" ? null : v)} value={workflowFilter ?? "all"}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Lọc theo quy trình" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả quy trình</SelectItem>
              {workflowOptions.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.workflowName || w.name || `Workflow ${w.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => setStepFilter(v === "all" ? null : v)} value={stepFilter ?? "all"}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Lọc theo bước" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bước</SelectItem>
              {stepOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
              </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Cards */}
      {/* removed debug display per request */}

      <Tabs value={selectedReport ?? "all"} onValueChange={(v) => handleReportClick(v === "all" ? "all" : v)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Tất cả bản ghi</TabsTrigger>
          <TabsTrigger value="waiting">Đang chờ</TabsTrigger>
          <TabsTrigger value="violated">Vi phạm</TabsTrigger>
          <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedReport === "all" ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleReportClick("all")}
        >
          <CardHeader className="flex items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">Tổng bản ghi</CardTitle>
              <CardDescription className="text-xs">Tổng bản ghi</CardDescription>
            </div>
            <Database className="h-6 w-6 text-blue-600" />
              </CardHeader>
              <CardContent>
            <div className="text-3xl font-bold text-gray-800">{countAll}</div>
              </CardContent>
            </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedReport === "waiting" ? "ring-2 ring-yellow-500" : ""
          }`}
          onClick={() => handleReportClick("waiting")}
        >
          <CardHeader className="flex items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">Đang chờ</CardTitle>
              <CardDescription className="text-xs">Chờ phê duyệt</CardDescription>
            </div>
            <Clock className="h-6 w-6 text-yellow-600" />
              </CardHeader>
              <CardContent>
            <div className="text-3xl font-bold text-gray-800">{countWaiting}</div>
              </CardContent>
            </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-red-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedReport === "violated" ? "ring-2 ring-red-500" : ""
          }`}
          onClick={() => handleReportClick("violated")}
        >
          <CardHeader className="flex items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">Vi phạm</CardTitle>
              <CardDescription className="text-xs">Vi phạm SLA</CardDescription>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
              </CardHeader>
              <CardContent>
            <div className="text-3xl font-bold text-red-600">{countViolated}</div>
              </CardContent>
            </Card>

        <Card
          className={`relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedReport === "completed" ? "ring-2 ring-green-500" : ""
          }`}
          onClick={() => handleReportClick("completed")}
        >
          <CardHeader className="flex items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">Hoàn thành</CardTitle>
              <CardDescription className="text-xs">Xử lý thành công</CardDescription>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
              </CardHeader>
              <CardContent>
            <div className="text-3xl font-bold text-green-600">{countCompleted}</div>
              </CardContent>
            </Card>
          </div>

      {/* Simple Table */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="font-semibold mb-4">Chi tiết bản ghi</h2>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">ID bản ghi Odoo</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Quy trình</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Bước hiện tại</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Trạng thái</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Vi phạm</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Bắt đầu</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Người phê duyệt</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Ngày phê duyệt</TableHead>
              <TableHead className="text-xs uppercase text-muted-foreground tracking-wider whitespace-nowrap truncate">Ngày đến hạn tiếp theo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
            {records.map((record) => (
                        <TableRow
                          key={record.id}
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDetail(true);
                          }}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            record.status === "violated"
                              ? "bg-red-50"
                              : record.status === "waiting"
                              ? "bg-yellow-50"
                              : record.status === "completed"
                              ? "bg-green-50"
                              : ""
                          }`}
                        >
                <TableCell className="whitespace-nowrap font-medium">{record.recordId ?? record.id}</TableCell>
                <TableCell className="whitespace-nowrap truncate max-w-[240px]" title={record.workflowName ?? String(record.workflow) ?? "-"}>{record.workflowName ?? record.workflow}</TableCell>
                <TableCell className="whitespace-nowrap truncate max-w-[220px]" title={record.stepName ?? record.currentStep ?? "-"}>{record.stepName ?? record.currentStep}</TableCell>
                          <TableCell className="whitespace-nowrap w-28 text-center">
                          <Badge
                            className="inline-block px-2 py-1 text-sm"
                            variant={record.status === "violated" ? "destructive" : record.status === "completed" ? "default" : "secondary"}
                            >
                    {statusLabel(record.status)}
                            </Badge>
                          </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{record.violationCount ?? 0}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{record.createdAt ? new Date(record.createdAt).toLocaleString() : "-"}</TableCell>
                <TableCell className="whitespace-nowrap truncate max-w-[180px]" title={record.userApprove && record.userApprove.length > 0 ? record.userApprove[0].name : record.approverName ?? "-"}>
                  <div className="flex items-center">
                    <span className="font-medium">
                      {record.userApprove && record.userApprove.length > 0
                        ? record.userApprove[0].name
                        : record.approverName ?? "-"}
                    </span>
                  </div>
                          </TableCell>
                <TableCell className="whitespace-nowrap">{record.approvedAt ? new Date(record.approvedAt).toLocaleString() : "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{record.nextDueAt ? new Date(record.nextDueAt).toLocaleString() : "-"}</TableCell>
                        </TableRow>
                  ))}
                </TableBody>
              </Table>

          {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
            {total > 0 ? `Hiển thị ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} của ${total} bản ghi` : "Không có bản ghi"}
            </div>
            <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || total === 0}>
                Trang trước
              </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, Math.ceil(total / pageSize)))} disabled={page >= Math.ceil(total / pageSize) || total === 0}>
                Trang sau
              </Button>
            </div>
          </div>
 
      {/* Record detail dialog */}
      <AlertDialog
        open={showDetail}
        onOpenChange={(open: boolean) => {
          setShowDetail(open);
          if (!open) {
            setSelectedRecord(null);
            // Refresh counts and records when the dialog closes so cards reflect latest data
            try {
              loadCounts();
            } catch (e) {
              // ignore; loadCounts is a safe async function
            }
            try {
              loadRecords();
            } catch (e) {
              // ignore
            }
          }
        }}
      >
      <AlertDialogContent className="w-full max-w-4xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Chi tiết bản ghi</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Thông tin chi tiết của bản ghi được chọn
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">ID bản ghi Odoo</div>
                    <div className="font-medium text-lg">{selectedRecord.recordId ?? selectedRecord.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Bước hiện tại</div>
                    <div className="font-medium">{selectedRecord.stepName ?? selectedRecord.currentStep}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Vi phạm</div>
                    <div className="font-medium">{selectedRecord.violationCount ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Người phê duyệt</div>
                    <div className="font-medium">
                      {selectedRecord.userApprove && selectedRecord.userApprove.length > 0
                        ? selectedRecord.userApprove[0].name
                        : selectedRecord.approverName ?? "-"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Quy trình</div>
                    <div className="font-medium text-lg">{selectedRecord.workflowName ?? selectedRecord.workflow}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Trạng thái</div>
                    <div className="mt-1">
                      <Badge variant={selectedRecord.status === "violated" ? "destructive" : selectedRecord.status === "completed" ? "default" : "secondary"}>
                        {statusLabel(selectedRecord.status)}
                          </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Bắt đầu</div>
                    <div className="font-medium">{selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Ngày phê duyệt</div>
                    <div className="font-medium">{selectedRecord.approvedAt ? new Date(selectedRecord.approvedAt).toLocaleString() : "-"}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Ghi chú / Dữ liệu thô</div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
                          setCopySuccess("Đã sao chép");
                          setTimeout(() => setCopySuccess(""), 2000);
                        } catch {
                          setCopySuccess("Không thể sao chép");
                          setTimeout(() => setCopySuccess(""), 2000);
                        }
                      }}
                    >
                      Sao chép
                    </Button>
                    {copySuccess && <div className="text-sm text-muted-foreground">{copySuccess}</div>}
                  </div>
                </div>
                <pre className="text-xs bg-slate-50 p-3 rounded max-h-72 overflow-auto font-mono">
{JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDetail(false)}>Đóng</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </main>
  );
}