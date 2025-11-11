"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/use-translation";
import { useSystemManagement } from "@/lib/hooks/use-system-management";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Settings,
  Workflow,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
} from "lucide-react";

export default function WorkflowsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    systems,
    workflows,
    loading,
    syncingSystems,
    syncSystem,
    getWorkflowsBySystem,
    getSystemStats,
    addWorkflow,
  } = useSystemManagement();

  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    title: "",
    description: "",
    type: "success" as "success" | "error" | "info",
  });
  const [showAddWorkflow, setShowAddWorkflow] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    systemId: "",
    systemName: "",
    name: "",
    model: "",
    steps: 1,
    violations: 0,
    status: "active" as "active" | "inactive",
  });

  const stats = getSystemStats();

  // // Sử dụng useMemo để cache filtered workflows và tránh re-render vô hạn
  // const filteredWorkflows = useMemo(() => {
  //   if (selectedSystem === "all") {
  //     return workflows;
  //   }
  //   // Chỉ filter từ workflows hiện có, không trigger async fetch trong render
  //   return workflows.filter((w) => w.systemId === selectedSystem);
  // }, [selectedSystem, workflows]);

  // Sử dụng useEffect để set state filteredWorkflows
  const [filteredWorkflows, setFilteredWorkflows] = useState(workflows);
  useEffect(() => {
    if (selectedSystem === "all") {
      setFilteredWorkflows(workflows);
    } else {
      setFilteredWorkflows(
        workflows.filter((w) => w.systemId === selectedSystem)
      );
    }
  }, [selectedSystem, workflows]);

  const handleSyncSystem = async (systemId: string) => {
    const result = await syncSystem(systemId);
    setAlertData({
      title: result.success ? "Đồng bộ thành công" : "Lỗi đồng bộ",
      description: result.success
        ? `Đã đồng bộ ${result.workflowsCount} workflows`
        : result.error || "Có lỗi xảy ra",
      type: result.success ? "success" : "error",
    });
    setShowAlert(true);
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
            {t("workflows.title")}
          </h1>
          <p className="text-muted-foreground">{t("workflows.subtitle")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/systems">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Quản lý Hệ thống
            </Button>
          </Link>
          <Button onClick={() => setShowAddWorkflow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("workflows.addWorkflow")}
          </Button>
        </div>
      </div>

      {/* System Filter */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">Lọc theo hệ thống:</span>
        <select
          value={selectedSystem}
          onChange={(e) => setSelectedSystem(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">Tất cả hệ thống</option>
          {systems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.icon} {system.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("workflows.totalWorkflows")}
            </CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">
              {t("workflows.configuredWorkflows")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hệ thống đã kết nối
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.connectedSystems}
            </div>
            <p className="text-xs text-muted-foreground">
              / {stats.totalSystems} hệ thống
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("workflows.activeRecords")}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredWorkflows.filter((w) => w.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("workflows.currentlyTracked")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("workflows.totalViolations")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {filteredWorkflows.reduce((sum, w) => sum + w.violations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("workflows.slaViolations")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t("workflows.overview")}</TabsTrigger>
          <TabsTrigger value="details">{t("workflows.details")}</TabsTrigger>
          <TabsTrigger value="settings">{t("workflows.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("workflows.workflowSummary")}</CardTitle>
              <CardDescription>{t("workflows.detailedView")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hệ thống</TableHead>
                    <TableHead>{t("workflows.workflowName")}</TableHead>
                    <TableHead>{t("workflows.model")}</TableHead>
                    <TableHead>{t("workflows.steps")}</TableHead>
                    <TableHead>{t("workflows.violations")}</TableHead>
                    <TableHead>{t("workflows.status")}</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkflows.map((workflow) => {
                    const system = systems.find(
                      (s) => s.id === workflow.systemId
                    );
                    return (
                      <TableRow
                        key={workflow.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/workflows/${workflow.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                              style={{
                                backgroundColor: system?.color || "#6B7280",
                              }}
                            >
                              {system?.icon || "🏢"}
                            </div>
                            <span className="text-sm font-medium">
                              {workflow.systemName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {workflow.workflowName || workflow.name}
                        </TableCell>
                        <TableCell>{workflow.model}</TableCell>
                        <TableCell>{workflow.steps}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              workflow.violations > 0
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {workflow.violations}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              workflow.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {workflow.status === "active"
                              ? t("workflows.active")
                              : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSyncSystem(workflow.systemId);
                              }}
                              disabled={syncingSystems.has(workflow.systemId)}
                            >
                              {syncingSystems.has(workflow.systemId) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>{t("workflows.workflowDetails")}</CardTitle>
              <CardDescription>{t("workflows.detailedView")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>Workflow details will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Thống kê theo Hệ thống</CardTitle>
              <CardDescription>
                Xem chi tiết workflows và vi phạm theo từng hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systems.map((system) => {
                  // Chỉ filter từ workflows hiện có, không trigger async fetch trong render
                  const systemWorkflows = workflows.filter(
                    (w) => w.systemId === system.id
                  );
                  const systemViolations = systemWorkflows.reduce(
                    (sum, wf) => sum + wf.violations,
                    0
                  );

                  return (
                    <div key={system.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: system.color }}
                          >
                            {system.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{system.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {system.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            className={
                              system.status === "connected"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {system.status === "connected"
                              ? "Đã kết nối"
                              : "Chưa kết nối"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncSystem(system.id)}
                            disabled={
                              !system.enabled || syncingSystems.has(system.id)
                            }
                          >
                            {syncingSystems.has(system.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Workflows:
                          </span>
                          <span className="ml-2 font-medium">
                            {systemWorkflows.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Vi phạm:
                          </span>
                          <span className="ml-2 font-medium text-red-600">
                            {systemViolations}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Lần sync cuối:
                          </span>
                          <span className="ml-2 font-medium">
                            {system.lastSync
                              ? new Date(system.lastSync).toLocaleString(
                                  "vi-VN"
                                )
                              : "Chưa sync"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                alertData.type === "error"
                  ? "text-destructive"
                  : "text-green-600"
              }
            >
              {alertData.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertData.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Workflow Dialog */}
      {showAddWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Thêm Quy trình mới</CardTitle>
              <CardDescription>Cấu hình thông tin quy trình</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium">Hệ thống</span>
                <select
                  value={newWorkflow.systemId}
                  onChange={(e) => {
                    const sys = systems.find((s) => s.id === e.target.value);
                    setNewWorkflow({
                      ...newWorkflow,
                      systemId: e.target.value,
                      systemName: sys?.name || "",
                    });
                  }}
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="">Chọn hệ thống</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-sm font-medium">Tên quy trình</span>
                <Input
                  value={newWorkflow.name}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, name: e.target.value })
                  }
                  placeholder="Ví dụ: Purchase Approval"
                  className="mt-1"
                />
              </div>

              <div>
                <span className="text-sm font-medium">Model</span>
                <Input
                  value={newWorkflow.model}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, model: e.target.value })
                  }
                  placeholder="Ví dụ: purchase.order"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-medium">Số bước</span>
                  <Input
                    type="number"
                    value={newWorkflow.steps}
                    onChange={(e) =>
                      setNewWorkflow({
                        ...newWorkflow,
                        steps: parseInt(e.target.value || "0", 10),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <span className="text-sm font-medium">Vi phạm ban đầu</span>
                  <Input
                    type="number"
                    value={newWorkflow.violations}
                    onChange={(e) =>
                      setNewWorkflow({
                        ...newWorkflow,
                        violations: parseInt(e.target.value || "0", 10),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Trạng thái</span>
                <select
                  value={newWorkflow.status}
                  onChange={(e) =>
                    setNewWorkflow({
                      ...newWorkflow,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddWorkflow(false)}
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    if (
                      !newWorkflow.systemId ||
                      !newWorkflow.name ||
                      !newWorkflow.model
                    ) {
                      setAlertData({
                        title: "Thiếu thông tin",
                        description:
                          "Vui lòng chọn hệ thống và nhập đủ tên, model",
                        type: "error",
                      });
                      setShowAlert(true);
                      return;
                    }
                    addWorkflow(newWorkflow);
                    setShowAddWorkflow(false);
                    setNewWorkflow({
                      systemId: "",
                      systemName: "",
                      name: "",
                      model: "",
                      steps: 1,
                      violations: 0,
                      status: "active",
                    });
                    setAlertData({
                      title: "Thành công",
                      description: "Đã thêm quy trình mới",
                      type: "success",
                    });
                    setShowAlert(true);
                  }}
                >
                  Thêm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
