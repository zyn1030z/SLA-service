"use client";
import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RefreshCw,
  TestTube,
  Trash2,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  FileText,
} from "lucide-react";
import { log } from "console";

export default function SystemsPage() {
  const { t } = useTranslation();

  // Get setSystems function from hook (we need to expose it)
  const [localSystems, setLocalSystems] = useState<any[]>([]);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [editingSystem, setEditingSystem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    baseUrl: "",
    apiKey: "",
    enabled: false,
    color: "#3B82F6",
    icon: "🏢",
    workflowEndpoint: "",
    apiMethod: "POST",
    apiHeaders: {},
    apiRequestBody: {},
  });

  const {
    systems,
    workflows,
    loading,
    syncingSystems,
    addSystem,
    updateSystem,
    deleteSystem,
    syncSystem: originalSyncSystem,
    testSystemConnection,
    getSystemStats,
    getWorkflowsBySystem,
    loadSystems,
  } = useSystemManagement();

  // Wrapper for syncSystem that calls proxy with system api config (like testSystemConnection)
  const syncSystem = async (systemId: string) => {
    // BREAKPOINT 4: Bắt đầu syncSystem function
    // debugger;

    const system = localSystems.find((s) => s.id === systemId);
    console.log("system", system);
    if (!system) {
      return {
        systemId,
        success: false,
        workflowsCount: 0,
        error: "System not found",
        timestamp: new Date(),
      };
    }
    if (!system.enabled) {
      return {
        systemId,
        success: false,
        workflowsCount: 0,
        error: "System not enabled",
        timestamp: new Date(),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // BREAKPOINT 5: Trước khi gọi proxy-odoo
      // debugger;
      const apiUrl = `${system.baseUrl}${
        system.apiConfig?.workflowEndpoint ||
        "/api/v2/tcm/workflow/get_workflow_steps"
      }`;
      const response = await fetch("/api/proxy-odoo", {                       
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemId: system.id,
          baseUrl: system.baseUrl,
          apiUrl,
          method: system.apiConfig?.method || "POST",
          headers: system.apiConfig?.headers || {},
          requestBody: system.apiConfig?.requestBody || {
            access_token: system.apiKey || "",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({} as any));
        return {
          systemId,
          success: false,
          workflowsCount: 0,
          error: err?.error || `Proxy error: ${response.status}`,
          timestamp: new Date(),
        };
      }

      const data = await response.json().catch(() => null);
      const workflowsFromApi =
        data?.result?.data?.workflows || data?.workflows || [];

      return {
        systemId,
        success: true,
        workflowsCount: Array.isArray(workflowsFromApi)
          ? workflowsFromApi.length
          : 0,
        timestamp: new Date(),
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      return {
        systemId,
        success: false,
        workflowsCount: 0,
        error: error?.message || "Unknown error",
        timestamp: new Date(),
      };
    }
  };

  // Đồng bộ localSystems với systems từ hook
  useEffect(() => {
    const mappedSystems = systems.map((system) => ({
      ...system,
      name: (system as any).systemName || system.name,
      status: system.status || "disconnected",
      workflowsCount: system.workflowsCount || 0,
      violationsCount: system.violationsCount || 0,
      lastSync: system.lastSync || null,
      color: system.color || "#3B82F6",
      icon: system.icon || "🏢",
      apiConfig: system.apiConfig || {
        workflowEndpoint: (system as any).workflowEndpoint || "",
        method: (system as any).apiMethod || "POST",
        headers: (system as any).apiHeaders || {},
        requestBody: (system as any).apiRequestBody || {},
      },
      workflowEndpoint:
        system.apiConfig?.workflowEndpoint ||
        (system as any).workflowEndpoint ||
        "",
      apiMethod:
        system.apiConfig?.method || (system as any).apiMethod || "POST",
      apiHeaders: system.apiConfig?.headers || (system as any).apiHeaders || {},
      apiRequestBody:
        system.apiConfig?.requestBody || (system as any).apiRequestBody || {},
    }));

    setLocalSystems(mappedSystems);
  }, [systems]);

  // Hook functions available
  const [showAlert, setShowAlert] = useState(false);
  const [alertData, setAlertData] = useState({
    title: "",
    description: "",
    type: "success" as "success" | "error" | "info",
    syncedWorkflows: [] as any[], // Danh sách workflows đã đồng bộ
  });
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [selectedSystemWorkflows, setSelectedSystemWorkflows] = useState<any[]>(
    []
  );
  const [selectedSystemName, setSelectedSystemName] = useState("");
  const [newSystem, setNewSystem] = useState({
    name: "",
    description: "",
    baseUrl: "",
    apiKey: "",
    enabled: false,
    color: "#3B82F6",
    icon: "🏢",
    apiConfig: {
      workflowEndpoint: "",
      method: "POST" as "GET" | "POST" | "PUT" | "DELETE",
      headers: {
        "Content-Type": "application/json",
      } as Record<string, string>,
      requestBody: {} as Record<string, any>,
    },
  });

  const stats = getSystemStats();

  const handleAddSystem = async () => {
    if (!newSystem.name || !newSystem.baseUrl || !newSystem.apiKey) {
      setAlertData({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên, URL và API Key",
        type: "error",
        syncedWorkflows: [],
      });
      setShowAlert(true);
      return;
    }

    try {
      await addSystem(newSystem);
      setNewSystem({
        name: "",
        description: "",
        baseUrl: "",
        apiKey: "",
        enabled: false,
        color: "#3B82F6",
        icon: "🏢",
        apiConfig: {
          workflowEndpoint: "",
          method: "POST" as "GET" | "POST" | "PUT" | "DELETE",
          headers: {
            "Content-Type": "application/json",
          } as Record<string, string>,
          requestBody: {} as Record<string, any>,
        },
      });
      setShowAddSystem(false);
      setAlertData({
        title: "Thành công",
        description: "Hệ thống đã được thêm!",
        type: "success",
        syncedWorkflows: [],
      });
      setShowAlert(true);
    } catch (error) {
      console.error("Error adding system:", error);
      setAlertData({
        title: "Lỗi tạo hệ thống",
        description: "Không thể tạo hệ thống mới. Vui lòng thử lại.",
        type: "error",
        syncedWorkflows: [],
      });
      setShowAlert(true);
    }
  };

  const handleSyncSystem = async (systemId: string) => {
    // BREAKPOINT 1: Bắt đầu sync từ button
    // debugger; // Đặt breakpoint ở đây để debug từ frontend

    // Find the system in localSystems
    const system = localSystems.find((s) => s.id === systemId);

    if (!system) {
      setAlertData({
        title: "Lỗi",
        description: "Hệ thống không tìm thấy",
        type: "error" as "success" | "error" | "info",
        syncedWorkflows: [],
      });
      setShowAlert(true);
      return;
    }

    // BREAKPOINT 2: Trước khi gọi syncSystem
    // debugger;
    const result = await syncSystem(systemId);

    // BREAKPOINT 3: Sau khi sync xong
    // debugger;
    // Lấy danh sách workflows vừa được đồng bộ
    const syncedWorkflows = getWorkflowsBySystem(systemId);
    console.log("🔄 result", result);
    console.log("🔄 Synced workflows:", syncedWorkflows, systemId);

    setAlertData({
      title: result.success ? "Đồng bộ thành công" : "Lỗi đồng bộ",
      description: result.success
        ? `Đã đồng bộ ${result.workflowsCount} workflows`
        : result.error || "Có lỗi xảy ra",
      type: result.success ? "success" : "error",
      syncedWorkflows: result.success ? syncedWorkflows : [],
    });
    setShowAlert(true);
  };

  const handleTestConnection = async (systemId: string) => {
    const isConnected = await testSystemConnection(systemId);
    // Cập nhật trạng thái ngay lập tức để phản hồi UI
    setLocalSystems((prev) =>
      prev.map((system) =>
        system.id === systemId
          ? {
              ...system,
              status: isConnected ? "connected" : "error",
              lastSync: isConnected
                ? new Date().toISOString()
                : system.lastSync,
            }
          : system
      )
    );
    // Đồng bộ lại danh sách từ backend để đảm bảo dữ liệu chính xác
    await loadSystems();

    setAlertData({
      title: isConnected ? "Kết nối thành công" : "Lỗi kết nối",
      description: isConnected
        ? "Hệ thống đã kết nối thành công"
        : "Không thể kết nối đến hệ thống",
      type: isConnected ? "success" : "error",
      syncedWorkflows: [],
    });
    setShowAlert(true);
  };

  const handleDeleteSystem = async (systemId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa hệ thống này?")) {
      await deleteSystem(systemId);
      setAlertData({
        title: "Đã xóa",
        description: "Hệ thống đã được xóa thành công",
        type: "success",
        syncedWorkflows: [],
      });
      setShowAlert(true);
    }
  };

  const handleViewWorkflows = (systemId: string) => {
    const systemWorkflows = getWorkflowsBySystem(systemId);
    const system = localSystems.find((s) => s.id === systemId);

    setSelectedSystemWorkflows(systemWorkflows);
    setSelectedSystemName(system?.name || "Unknown System");
    setShowWorkflows(true);
  };

  const openEditSystem = (systemId: string) => {
    const sys = localSystems.find((s) => s.id === systemId);
    if (!sys) return;
    setEditForm({
      name: sys.name,
      description: sys.description,
      baseUrl: sys.baseUrl,
      apiKey: sys.apiKey,
      enabled: sys.enabled,
      color: sys.color,
      icon: sys.icon,
      workflowEndpoint: sys.workflowEndpoint || "",
      apiMethod: sys.apiMethod || "POST",
      apiHeaders: sys.apiHeaders || {
        "Content-Type": "application/json",
      },
      apiRequestBody: sys.apiRequestBody || {},
    });
    setEditingSystem(systemId);
  };

  const handleSaveEditSystem = async () => {
    if (!editingSystem) return;
    if (!editForm.name || !editForm.baseUrl) {
      setAlertData({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên và URL",
        type: "error",
        syncedWorkflows: [],
      });
      setShowAlert(true);
      return;
    }

    try {
      await updateSystem(editingSystem, { ...editForm });
      // Reload systems from API to get updated data
      await loadSystems();
      setEditingSystem(null);
      setAlertData({
        title: "Thành công",
        description: "Đã lưu cấu hình hệ thống",
        type: "success",
        syncedWorkflows: [],
      });
      setShowAlert(true);
    } catch (error) {
      console.error("Error saving system:", error);
      setAlertData({
        title: "Lỗi",
        description: "Không thể lưu cấu hình hệ thống",
        type: "error",
        syncedWorkflows: [],
      });
      setShowAlert(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Đã kết nối";
      case "error":
        return "Lỗi kết nối";
      default:
        return "Chưa kết nối";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
            Quản lý Hệ thống
          </h1>
          <p className="text-muted-foreground">
            Quản lý cấu hình và đồng bộ workflows từ nhiều hệ thống
          </p>
        </div>
        <Button onClick={() => setShowAddSystem(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm Hệ thống
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Hệ thống</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSystems}</div>
            <p className="text-xs text-muted-foreground">
              Hệ thống đã cấu hình
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã Kết nối</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.connectedSystems}
            </div>
            <p className="text-xs text-muted-foreground">
              Hệ thống đang hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Workflows
            </CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalWorkflows}
            </div>
            <p className="text-xs text-muted-foreground">
              Workflows đang theo dõi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Vi phạm</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalViolations}
            </div>
            <p className="text-xs text-muted-foreground">Vi phạm SLA</p>
          </CardContent>
        </Card>
      </div>

      {/* Systems Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Hệ thống</CardTitle>
          <CardDescription>
            Quản lý cấu hình và trạng thái kết nối của các hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hệ thống</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Workflows</TableHead>
                <TableHead>Vi phạm</TableHead>
                <TableHead>Lần đồng bộ cuối</TableHead>
                <TableHead>Bật</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localSystems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <p>Không có hệ thống nào được tìm thấy</p>
                      <p className="text-sm">
                        Debug: localSystems.length = {localSystems.length}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                localSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: system.color }}
                        >
                          {system.icon}
                        </div>
                        <div>
                          <div className="font-medium">{system.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {system.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(system.status)}
                        <Badge className={getStatusColor(system.status)}>
                          {getStatusText(system.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{system.workflowsCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          system.violationsCount > 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {system.violationsCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {system.lastSync
                        ? new Date(system.lastSync).toLocaleString("vi-VN")
                        : "Chưa đồng bộ"}
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={system.enabled}
                        onChange={async (e) => {
                          try {
                            const isEnabled = e.target.checked;
                            // Chỉ cập nhật status khi tắt checkbox
                            const updates: any = {
                              enabled: isEnabled,
                            };
                            if (!isEnabled) {
                              updates.status = "disconnected";
                            }
                            await updateSystem(system.id, updates);
                            // Reload systems from API to get updated data
                            await loadSystems();
                          } catch (error) {
                            console.error(
                              "Error updating system enabled status:",
                              error
                            );
                          }
                        }}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConnection(system.id)}
                          disabled={syncingSystems.has(system.id)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncSystem(system.id)}
                          disabled={syncingSystems.has(system.id)}
                        >
                          {syncingSystems.has(system.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewWorkflows(system.id)}
                          title="Xem workflows"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSystem(system.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSystem(system.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add System Dialog */}
      {showAddSystem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Thêm Hệ thống Mới</CardTitle>
              <CardDescription>
                Cấu hình hệ thống mới để đồng bộ workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Configuration - 2 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium">Tên hệ thống</span>
                    <Input
                      value={newSystem.name}
                      onChange={(e) =>
                        setNewSystem({ ...newSystem, name: e.target.value })
                      }
                      placeholder="Ví dụ: Odoo Production"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">Mô tả</span>
                    <Input
                      value={newSystem.description}
                      onChange={(e) =>
                        setNewSystem({
                          ...newSystem,
                          description: e.target.value,
                        })
                      }
                      placeholder="Mô tả hệ thống"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">URL API</span>
                    <Input
                      value={newSystem.baseUrl}
                      onChange={(e) =>
                        setNewSystem({ ...newSystem, baseUrl: e.target.value })
                      }
                      placeholder="https://your-system.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">API Key</span>
                    <Input
                      type="password"
                      value={newSystem.apiKey}
                      onChange={(e) =>
                        setNewSystem({ ...newSystem, apiKey: e.target.value })
                      }
                      placeholder="Your API Key"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bật hệ thống</span>
                    <input
                      type="checkbox"
                      checked={newSystem.enabled}
                      onChange={(e) =>
                        setNewSystem({
                          ...newSystem,
                          enabled: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <div>
                      <span className="text-sm font-medium">Màu</span>
                      <input
                        type="color"
                        value={newSystem.color}
                        onChange={(e) =>
                          setNewSystem({ ...newSystem, color: e.target.value })
                        }
                        className="ml-2 h-9 w-12 p-0 border rounded"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Icon</span>
                      <Input
                        value={newSystem.icon}
                        onChange={(e) =>
                          setNewSystem({ ...newSystem, icon: e.target.value })
                        }
                        placeholder="🏢"
                        className="mt-1 w-24"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* API Configuration Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Cấu hình API</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium">
                        Workflow Endpoint
                      </span>
                      <Input
                        value={newSystem.apiConfig.workflowEndpoint}
                        onChange={(e) =>
                          setNewSystem({
                            ...newSystem,
                            apiConfig: {
                              ...newSystem.apiConfig,
                              workflowEndpoint: e.target.value,
                            },
                          })
                        }
                        placeholder="/api/v2/tcm/workflow/get_workflow_steps"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <span className="text-sm font-medium">HTTP Method</span>
                      <select
                        value={newSystem.apiConfig.method}
                        onChange={(e) =>
                          setNewSystem({
                            ...newSystem,
                            apiConfig: {
                              ...newSystem.apiConfig,
                              method: e.target.value as
                                | "GET"
                                | "POST"
                                | "PUT"
                                | "DELETE",
                            },
                          })
                        }
                        className="mt-1 w-full p-2 border rounded"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium">
                        Headers (JSON)
                      </span>
                      <textarea
                        value={JSON.stringify(
                          newSystem.apiConfig.headers,
                          null,
                          2
                        )}
                        onChange={(e) => {
                          try {
                            const headers = JSON.parse(e.target.value);
                            setNewSystem({
                              ...newSystem,
                              apiConfig: {
                                ...newSystem.apiConfig,
                                headers,
                              },
                            });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        placeholder='{"Content-Type": "application/json", "Cookie": "session_id=abc123"}'
                        className="mt-1 w-full h-24 p-2 border rounded text-sm font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-sm font-medium">
                        Request Body (JSON)
                      </span>
                      <textarea
                        value={JSON.stringify(
                          newSystem.apiConfig.requestBody,
                          null,
                          2
                        )}
                        onChange={(e) => {
                          try {
                            const requestBody = JSON.parse(e.target.value);
                            setNewSystem({
                              ...newSystem,
                              apiConfig: {
                                ...newSystem.apiConfig,
                                requestBody,
                              },
                            });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        placeholder='{"access_token": "your-token-here"}'
                        className="mt-1 w-full h-32 p-2 border rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddSystem(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
                <Button onClick={handleAddSystem}>
                  <Save className="h-4 w-4 mr-2" />
                  Thêm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit System Dialog */}
      {editingSystem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Cấu hình hệ thống</CardTitle>
              <CardDescription>Chỉnh sửa cấu hình hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Configuration - 2 columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium">Tên hệ thống</span>
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="Ví dụ: Odoo Production"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">Mô tả</span>
                    <Input
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Mô tả hệ thống"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">URL API</span>
                    <Input
                      value={editForm.baseUrl}
                      onChange={(e) =>
                        setEditForm({ ...editForm, baseUrl: e.target.value })
                      }
                      placeholder="https://your-system.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <span className="text-sm font-medium">API Key</span>
                    <Input
                      type="password"
                      value={editForm.apiKey}
                      onChange={(e) =>
                        setEditForm({ ...editForm, apiKey: e.target.value })
                      }
                      placeholder="Your API Key"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bật hệ thống</span>
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={(e) =>
                        setEditForm({ ...editForm, enabled: e.target.checked })
                      }
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <div>
                      <span className="text-sm font-medium">Màu</span>
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) =>
                          setEditForm({ ...editForm, color: e.target.value })
                        }
                        className="ml-2 h-9 w-12 p-0 border rounded"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Icon</span>
                      <Input
                        value={editForm.icon}
                        onChange={(e) =>
                          setEditForm({ ...editForm, icon: e.target.value })
                        }
                        placeholder="🏢"
                        className="mt-1 w-24"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* API Configuration Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Cấu hình API</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium">
                        Workflow Endpoint
                      </span>
                      <Input
                        value={editForm.workflowEndpoint}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            workflowEndpoint: e.target.value,
                          })
                        }
                        placeholder="/api/v2/tcm/workflow/get_workflow_steps"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <span className="text-sm font-medium">HTTP Method</span>
                      <select
                        value={editForm.apiMethod}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            apiMethod: e.target.value as
                              | "GET"
                              | "POST"
                              | "PUT"
                              | "DELETE",
                          })
                        }
                        className="mt-1 w-full p-2 border rounded"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium">
                        Headers (JSON)
                      </span>
                      <textarea
                        value={JSON.stringify(editForm.apiHeaders, null, 2)}
                        onChange={(e) => {
                          try {
                            const headers = JSON.parse(e.target.value);
                            setEditForm({
                              ...editForm,
                              apiHeaders: headers,
                            });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        placeholder='{"Content-Type": "application/json", "Cookie": "session_id=abc123"}'
                        className="mt-1 w-full h-24 p-2 border rounded text-sm font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-sm font-medium">
                        Request Body (JSON)
                      </span>
                      <textarea
                        value={JSON.stringify(editForm.apiRequestBody, null, 2)}
                        onChange={(e) => {
                          try {
                            const requestBody = JSON.parse(e.target.value);
                            setEditForm({
                              ...editForm,
                              apiRequestBody: requestBody,
                            });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        placeholder='{"access_token": "your-token-here"}'
                        className="mt-1 w-full h-32 p-2 border rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingSystem(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
                <Button onClick={handleSaveEditSystem}>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

            {/* Hiển thị danh sách workflows đã đồng bộ */}
            {alertData.syncedWorkflows.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">
                  Workflows đã đồng bộ:
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {alertData.syncedWorkflows.map((workflow, index) => (
                    <div
                      key={workflow.id || index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {workflow.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Model: {workflow.model} • Steps: {workflow.steps}
                        </div>
                      </div>
                      <Badge
                        variant={
                          workflow.status === "active" ? "default" : "secondary"
                        }
                      >
                        {workflow.status === "active"
                          ? "Hoạt động"
                          : "Không hoạt động"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workflows Modal */}
      <AlertDialog open={showWorkflows} onOpenChange={setShowWorkflows}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Workflows của hệ thống: {selectedSystemName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Danh sách các workflows đã được đồng bộ từ hệ thống này
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {selectedSystemWorkflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>Chưa có workflows nào được đồng bộ từ hệ thống này</p>
                <p className="text-sm">
                  Hãy click "Đồng bộ" để lấy workflows từ hệ thống
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {selectedSystemWorkflows.map((workflow, index) => (
                  <Card key={workflow.id || index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {workflow.name}
                            </h3>
                            <Badge
                              variant={
                                workflow.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {workflow.status === "active"
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Model:</span>{" "}
                              {workflow.model}
                            </div>
                            <div>
                              <span className="font-medium">Số bước:</span>{" "}
                              {workflow.steps}
                            </div>
                            <div>
                              <span className="font-medium">Vi phạm:</span>{" "}
                              {workflow.violations}
                            </div>
                            <div>
                              <span className="font-medium">Cập nhật:</span>{" "}
                              {new Date(workflow.lastUpdated).toLocaleString(
                                "vi-VN"
                              )}
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <h4 className="text-sm font-medium mb-2">
                              Chi tiết từ Odoo:
                            </h4>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-medium">
                                  Workflow ID:
                                </span>{" "}
                                {workflow.odooData.workflowId}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Tên workflow:
                                </span>{" "}
                                {workflow.odooData.workflowName}
                              </div>
                              <div>
                                <span className="font-medium">Model:</span>{" "}
                                {workflow.odooData.model}
                              </div>
                              <div>
                                <span className="font-medium">On Create:</span>{" "}
                                {workflow.odooData.onCreate ? "Có" : "Không"}
                              </div>
                              <div>
                                <span className="font-medium">Share:</span>{" "}
                                {workflow.odooData.share ? "Có" : "Không"}
                              </div>
                              <div>
                                <span className="font-medium">Domain:</span>{" "}
                                {workflow.odooData.domain}
                              </div>
                              <div>
                                <span className="font-medium">
                                  Số activities:
                                </span>{" "}
                                {workflow.odooData.activityCount}
                              </div>
                              {workflow.odooData.note && (
                                <div>
                                  <span className="font-medium">Ghi chú:</span>{" "}
                                  {workflow.odooData.note}
                                </div>
                              )}
                            </div>

                            {/* Hiển thị danh sách activities */}
                            {workflow.odooData.activities &&
                              workflow.odooData.activities.length > 0 && (
                                <div className="mt-3">
                                  <h5 className="text-xs font-medium mb-2 text-muted-foreground">
                                    Activities (
                                    {workflow.odooData.activities.length}):
                                  </h5>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {workflow.odooData.activities
                                      .slice(0, 5)
                                      .map((activity: any, idx: number) => (
                                        <div
                                          key={activity.id}
                                          className="text-xs p-2 bg-background rounded border"
                                        >
                                          <div className="font-medium">
                                            {activity.name}
                                          </div>
                                          <div className="text-muted-foreground">
                                            Code: {activity.code} | Kind:{" "}
                                            {activity.kind}
                                          </div>
                                          {activity.flowStart && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Start
                                            </Badge>
                                          )}
                                          {activity.flowDone && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Done
                                            </Badge>
                                          )}
                                          {activity.flowCancel && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              Cancel
                                            </Badge>
                                          )}
                                        </div>
                                      ))}
                                    {workflow.odooData.activities.length >
                                      5 && (
                                      <div className="text-xs text-muted-foreground text-center py-1">
                                        ... và{" "}
                                        {workflow.odooData.activities.length -
                                          5}{" "}
                                        activities khác
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWorkflows(false)}>
              Đóng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
