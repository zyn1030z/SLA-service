"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  Bell,
  Zap,
  X,
} from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "lottie-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        autoplay?: boolean | string;
        loop?: boolean | string;
        src?: string;
        background?: string;
        speed?: number | string;
      };
    }
  }
}

interface WorkflowStep {
  id: string;
  stepCode: string;
  stepName: string;
  slaHours: number;
  violationAction: "notify" | "auto_approve";
  maxViolations: number;
  order: number;
  isActive: boolean;
  // Original activity data from Odoo API
  originalActivity?: {
    activityId: number;
    kind: string;
    splitMode: string;
    joinMode: string;
    flowStart: boolean;
    flowStop: boolean;
    flowCancel: boolean;
    flowDone: boolean;
    action?: string;
    note?: string;
  };
  // API Configuration for each action
  notifyApiConfig?: {
    url: string;
    method: "POST" | "GET" | "PUT";
    headers: Record<string, string>;
    body?: Record<string, any>;
  };
  autoApproveApiConfig?: {
    approvalType: "single" | "multiple"; // Phê duyệt 1 lần hoặc nhiều lần
    singleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: Record<string, any>;
    };
    multipleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: Record<string, any>;
    };
  };
}

interface Activity {
  id: string;
  activityId: number;
  name: string;
  code?: string;
  kind: string;
  splitMode: string;
  joinMode: string;
  flowStart: boolean;
  flowStop: boolean;
  flowCancel: boolean;
  flowDone: boolean;
  action?: string;
  note?: string;
  transitions?: Transition[];
}

interface Transition {
  id: string;
  transitionId: number;
  signal: string;
  condition?: string;
  sequence: number;
  targetActivityId: number;
  targetActivityName: string;
  groupRequired: boolean;
}

interface WorkflowDetail {
  id: string;
  workflowId?: number;
  workflowName: string;
  name: string;
  model: string;
  description: string;
  steps: WorkflowStep[];
  activities?: Activity[];
  totalViolations: number;
  activeRecords: number;
  status: "active" | "inactive";
}

export default function WorkflowDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLottieReady, setIsLottieReady] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WorkflowStep>>({});
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfigStep, setApiConfigStep] = useState<string | null>(null);
  const [apiConfigType, setApiConfigType] = useState<"notify" | "auto_approve">(
    "notify"
  );
  const [apiConfigForm, setApiConfigForm] = useState({
    url: "",
    method: "POST" as "POST" | "GET" | "PUT",
    headers: "{}",
    body: "{}",
  });
  const [approvalType, setApprovalType] = useState<"single" | "multiple">(
    "single"
  );

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/workflows/${workflowId}`
        );
        if (response.ok) {
          const workflowData = await response.json();

          // Transform API data to match our interface
          // Convert activities to workflow steps
          const steps: WorkflowStep[] = (workflowData.activities || []).map(
            (activity: any, index: number) => ({
              id: activity.id || `activity-${activity.activityId}`,
              stepCode: activity.code || `step-${activity.activityId}`,
              stepName: activity.name,
              slaHours: activity.slaHours || 24, // From database or default
              violationAction: activity.violationAction || "notify", // From database or default
              maxViolations: activity.maxViolations || 3, // From database or default
              order: index + 1,
              isActive:
                activity.isActive !== undefined ? activity.isActive : true, // From database or default
              // Store original activity data for reference
              originalActivity: {
                activityId: activity.activityId,
                kind: activity.kind,
                splitMode: activity.splitMode,
                joinMode: activity.joinMode,
                flowStart: activity.flowStart,
                flowStop: activity.flowStop,
                flowCancel: activity.flowCancel,
                flowDone: activity.flowDone,
                action: activity.action,
                note: activity.note,
              },
            })
          );

          setWorkflow({
            id: workflowData.id,
            workflowId: workflowData.workflowId,
            workflowName: workflowData.workflowName,
            name: workflowData.workflowName || workflowData.name,
            model: workflowData.model,
            description:
              workflowData.note || `Workflow for ${workflowData.model}`,
            steps: steps, // Use converted activities as steps
            activities: workflowData.activities || [],
            totalViolations: workflowData.violations || 0,
            activeRecords: 0, // This would need to be calculated
            status: workflowData.status,
          });
        } else {
          console.error("Failed to load workflow:", response.statusText);
        }
      } catch (error) {
        console.error("Error loading workflow:", error);
      }
      setLoading(false);
    };

    loadWorkflow();
  }, [workflowId]);

  useEffect(() => {
    // If the script was already added elsewhere
    if (typeof window !== "undefined" && "customElements" in window) {
      if (customElements.get("lottie-player")) {
        setIsLottieReady(true);
      }
    }
  }, []);

  const handleStepUpdate = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!workflow) return;

    setWorkflow({
      ...workflow,
      steps: workflow.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    });
    setEditingStep(null);
    setEditForm({});
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step.id);
    setEditForm({
      stepName: step.stepName,
      stepCode: step.stepCode,
      slaHours: step.slaHours,
      violationAction: step.violationAction,
      maxViolations: step.maxViolations,
      isActive: step.isActive,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStep || !workflow) return;

    try {
      // Find the step to get the activity ID
      const step = workflow.steps.find((s) => s.id === editingStep);
      if (!step) return;

      // Call API to update activity in database
      const response = await fetch(
        `http://localhost:3000/workflows/activity/${step.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            violationAction: editForm.violationAction,
            slaHours: editForm.slaHours,
            maxViolations: editForm.maxViolations,
            isActive: editForm.isActive,
          }),
        }
      );

      if (response.ok) {
        // Update local state only after successful API call
        handleStepUpdate(editingStep, editForm);
      } else {
        console.error("Failed to update activity:", response.statusText);
        alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Error updating activity:", error);
      alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    }
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditForm({});
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      const res = await fetch(
        `http://localhost:3000/workflows/activity/${stepId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(`Failed to delete: ${res.status}`);
      }
      setWorkflow((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.filter((s) => s.id !== stepId),
            }
          : prev
      );
    } catch (e) {
      console.error(e);
      alert("Xóa bước thất bại. Vui lòng thử lại.");
    }
  };

  const handleAddStep = (newStep: Omit<WorkflowStep, "id">) => {
    if (!workflow) return;

    const step: WorkflowStep = {
      ...newStep,
      id: Date.now().toString(),
    };

    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, step].sort((a, b) => a.order - b.order),
    });
    setShowAddStep(false);
  };

  const openApiConfig = (stepId: string, type: "notify" | "auto_approve") => {
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    setApiConfigStep(stepId);
    setApiConfigType(type);

    if (type === "notify") {
      const config = step.notifyApiConfig;
      setApiConfigForm({
        url: config?.url || "",
        method: config?.method || "POST",
        headers: config?.headers
          ? JSON.stringify(config.headers, null, 2)
          : "{}",
        body: config?.body ? JSON.stringify(config.body, null, 2) : "{}",
      });
    } else {
      // Auto approve config
      const config = step.autoApproveApiConfig;
      setApprovalType(config?.approvalType || "single");

      const currentConfig =
        approvalType === "single"
          ? config?.singleApprovalConfig
          : config?.multipleApprovalConfig;

      setApiConfigForm({
        url: currentConfig?.url || "",
        method: currentConfig?.method || "POST",
        headers: currentConfig?.headers
          ? JSON.stringify(currentConfig.headers, null, 2)
          : "{}",
        body: currentConfig?.body
          ? JSON.stringify(currentConfig.body, null, 2)
          : "{}",
      });
    }

    setShowApiConfig(true);
  };

  const handleApprovalTypeChange = (newType: "single" | "multiple") => {
    if (!workflow || !apiConfigStep) return;

    setApprovalType(newType);

    const step = workflow.steps.find((s) => s.id === apiConfigStep);
    if (!step || !step.autoApproveApiConfig) return;

    const config =
      newType === "single"
        ? step.autoApproveApiConfig.singleApprovalConfig
        : step.autoApproveApiConfig.multipleApprovalConfig;

    setApiConfigForm({
      url: config?.url || "",
      method: config?.method || "POST",
      headers: config?.headers ? JSON.stringify(config.headers, null, 2) : "{}",
      body: config?.body ? JSON.stringify(config.body, null, 2) : "{}",
    });
  };

  const saveApiConfig = () => {
    if (!workflow || !apiConfigStep) return;

    try {
      const headers = JSON.parse(apiConfigForm.headers);
      const body = JSON.parse(apiConfigForm.body);

      const config = {
        url: apiConfigForm.url,
        method: apiConfigForm.method,
        headers,
        body,
      };

      setWorkflow({
        ...workflow,
        steps: workflow.steps.map((step) => {
          if (step.id === apiConfigStep) {
            if (apiConfigType === "notify") {
              return {
                ...step,
                notifyApiConfig: config,
              };
            } else {
              // Auto approve config
              const existingAutoConfig = step.autoApproveApiConfig || {};
              const updatedAutoConfig = {
                ...existingAutoConfig,
                approvalType,
                [approvalType === "single"
                  ? "singleApprovalConfig"
                  : "multipleApprovalConfig"]: config,
              };

              return {
                ...step,
                autoApproveApiConfig: updatedAutoConfig,
              };
            }
          }
          return step;
        }),
      });

      setShowApiConfig(false);
      setApiConfigStep(null);
    } catch (error) {
      alert("Lỗi định dạng JSON trong Headers hoặc Body");
    }
  };

  const getViolationActionIcon = (action: string) => {
    return action === "notify" ? (
      <Bell className="h-4 w-4" />
    ) : (
      <Zap className="h-4 w-4" />
    );
  };

  const getViolationActionText = (action: string) => {
    return action === "notify"
      ? t("workflow.notify")
      : t("workflow.autoApprove");
  };

  const getViolationActionColor = (action: string) => {
    return action === "notify" ? "text-orange-600" : "text-blue-600";
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

  if (!workflow) {
    return (
      <main className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-muted-foreground">
            Workflow not found
          </h2>
        </div>
      </main>
    );
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
        strategy="afterInteractive"
        onLoad={() => setIsLottieReady(true)}
      />
      <main className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {workflow.name}
              </h1>
              <p className="text-muted-foreground">{workflow.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={workflow.status === "active" ? "default" : "secondary"}
            >
              <span className="flex items-center">
                {workflow.status === "active" ? (
                  isLottieReady ? (
                    <span
                      className="mr-1.5 inline-block align-middle"
                      dangerouslySetInnerHTML={{
                        __html:
                          '<lottie-player autoplay loop src="/lotties/green-flashing.json" style="width:20px;height:20px;"></lottie-player>',
                      }}
                    />
                  ) : (
                    <span className="relative mr-1.5">
                      <span className="absolute -inset-1 rounded-full animate-ping" />
                      {/* <CheckCircle className="h-10 w-10 relative text-green-600" /> */}
                    </span>
                  )
                ) : (
                  <XCircle className="h-10 w-10 mr-1.5 text-red-600" />
                )}
                {workflow.status === "active"
                  ? t("workflow.active")
                  : t("workflow.inactive")}
              </span>
            </Badge>
            {/* <Button>
            <Settings className="h-4 w-4 mr-2" />
            {t("workflow.settings")}
          </Button> */}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("workflow.totalSteps")}
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflow.steps.length}</div>
              <p className="text-xs text-muted-foreground">
                {t("workflow.configuredSteps")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("workflow.activeRecords")}
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {workflow.activeRecords}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("workflow.currentlyTracked")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("workflow.totalViolations")}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {workflow.totalViolations}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("workflow.slaViolations")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Steps */}
        <Tabs defaultValue="steps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="steps">{t("workflow.steps")}</TabsTrigger>
            <TabsTrigger value="configuration">
              {t("workflow.configuration")}
            </TabsTrigger>
            <TabsTrigger value="violations">
              {t("workflow.violations")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t("workflow.workflowSteps")}</CardTitle>
                    <CardDescription>
                      {t("workflow.stepsDescription")}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddStep(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("workflow.addStep")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("workflow.order")}</TableHead>
                      <TableHead>{t("workflow.stepName")}</TableHead>
                      <TableHead>Action (Odoo)</TableHead>
                      <TableHead>{t("workflow.slaHours")}</TableHead>
                      <TableHead>{t("workflow.violationAction")}</TableHead>
                      <TableHead>{t("workflow.maxViolations")}</TableHead>
                      <TableHead>Cấu hình API</TableHead>
                      <TableHead>{t("workflow.status")}</TableHead>
                      <TableHead>{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflow.steps.map((step) => (
                      <React.Fragment key={step.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {step.order}
                          </TableCell>
                          <TableCell>
                            {editingStep === step.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editForm.stepName || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      stepName: e.target.value,
                                    })
                                  }
                                  placeholder={t(
                                    "workflow.stepNamePlaceholder"
                                  )}
                                />
                                <Input
                                  value={editForm.stepCode || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      stepCode: e.target.value,
                                    })
                                  }
                                  placeholder={t(
                                    "workflow.stepCodePlaceholder"
                                  )}
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium">
                                  {step.stepName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {step.stepCode}
                                </div>
                                {step.originalActivity && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    <div>
                                      Kind: {step.originalActivity.kind}
                                    </div>
                                    <div>
                                      Split: {step.originalActivity.splitMode} |
                                      Join: {step.originalActivity.joinMode}
                                    </div>
                                    {step.originalActivity.flowStart && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Start
                                      </Badge>
                                    )}
                                    {step.originalActivity.flowStop && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Stop
                                      </Badge>
                                    )}
                                    {step.originalActivity.flowCancel && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Cancel
                                      </Badge>
                                    )}
                                    {step.originalActivity.flowDone && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        Done
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {step.originalActivity?.action ? (
                              <div className="max-w-xs">
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {step.originalActivity.action}
                                </pre>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingStep === step.id ? (
                              <Input
                                type="number"
                                value={editForm.slaHours || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    slaHours: parseInt(e.target.value),
                                  })
                                }
                                className="w-20"
                              />
                            ) : (
                              <Badge variant="outline">{step.slaHours}h</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingStep === step.id ? (
                              <select
                                value={editForm.violationAction || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    violationAction: e.target.value as
                                      | "notify"
                                      | "auto_approve",
                                  })
                                }
                                className="w-full p-1 border rounded text-sm"
                              >
                                <option value="notify">
                                  {t("workflow.notify")}
                                </option>
                                <option value="auto_approve">
                                  {t("workflow.autoApprove")}
                                </option>
                              </select>
                            ) : (
                              <div
                                className={`flex items-center space-x-2 ${getViolationActionColor(
                                  step.violationAction
                                )}`}
                              >
                                {getViolationActionIcon(step.violationAction)}
                                <span className="text-sm">
                                  {getViolationActionText(step.violationAction)}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingStep === step.id ? (
                              <Input
                                type="number"
                                value={editForm.maxViolations || ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    maxViolations: parseInt(e.target.value),
                                  })
                                }
                                className="w-16"
                              />
                            ) : (
                              <Badge
                                variant={
                                  step.maxViolations <= 2
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {step.maxViolations}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApiConfig(step.id, "notify")}
                                disabled={
                                  editingStep === step.id
                                    ? editForm.violationAction !== "notify"
                                    : step.violationAction !== "notify"
                                }
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                Thông báo
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openApiConfig(step.id, "auto_approve")
                                }
                                disabled={
                                  editingStep === step.id
                                    ? editForm.violationAction !==
                                      "auto_approve"
                                    : step.violationAction !== "auto_approve"
                                }
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Auto
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingStep === step.id ? (
                              <select
                                value={
                                  editForm.isActive ? "active" : "inactive"
                                }
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    isActive: e.target.value === "active",
                                  })
                                }
                                className="w-full p-1 border rounded text-sm"
                              >
                                <option value="active">
                                  {t("workflow.active")}
                                </option>
                                <option value="inactive">
                                  {t("workflow.inactive")}
                                </option>
                              </select>
                            ) : (
                              <Badge
                                variant={
                                  step.isActive ? "default" : "secondary"
                                }
                              >
                                {step.isActive
                                  ? t("workflow.active")
                                  : t("workflow.inactive")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {editingStep === step.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSaveEdit}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditStep(step)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <span>
                                          <Trash2 className="h-4 w-4" />
                                        </span>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            {t("workflow.deleteStepConfirm")}
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Thao tác này sẽ xóa bước và toàn bộ
                                            transitions liên quan. Bạn không thể
                                            hoàn tác.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Hủy
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDeleteStep(step.id)
                                            }
                                          >
                                            Xóa
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuration">
            <Card>
              <CardHeader>
                <CardTitle>{t("workflow.slaConfiguration")}</CardTitle>
                <CardDescription>
                  {t("workflow.slaConfigurationDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {t("workflow.notificationSettings")}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("workflow.emailNotifications")}
                        </span>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("workflow.smsNotifications")}
                        </span>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("workflow.slackNotifications")}
                        </span>
                        <input type="checkbox" className="rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      {t("workflow.autoApprovalSettings")}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">
                          {t("workflow.globalMaxViolations")}
                        </span>
                        <Input type="number" placeholder="3" className="mt-1" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {t("workflow.escalationHours")}
                        </span>
                        <Input
                          type="number"
                          placeholder="24"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">
                    {t("workflow.violationHandling")}
                  </h3>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-orange-600" />
                          <span>{t("workflow.notifyMode")}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("workflow.notifyModeDescription")}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {t("workflow.notifyModeBenefit1")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {t("workflow.notifyModeBenefit2")}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span>{t("workflow.autoApproveMode")}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("workflow.autoApproveModeDescription")}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {t("workflow.autoApproveModeBenefit1")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {t("workflow.autoApproveModeBenefit2")}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations">
            <Card>
              <CardHeader>
                <CardTitle>{t("workflow.violationHistory")}</CardTitle>
                <CardDescription>
                  {t("workflow.violationHistoryDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                  <p>{t("workflow.noViolationsYet")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Step Dialog */}
        {showAddStep && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{t("workflow.addNewStep")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium">
                    {t("workflow.stepName")}
                  </span>
                  <Input placeholder={t("workflow.stepNamePlaceholder")} />
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {t("workflow.stepCode")}
                  </span>
                  <Input placeholder={t("workflow.stepCodePlaceholder")} />
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {t("workflow.slaHours")}
                  </span>
                  <Input type="number" placeholder="24" />
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {t("workflow.violationAction")}
                  </span>
                  <select className="w-full mt-1 p-2 border rounded">
                    <option value="notify">{t("workflow.notify")}</option>
                    <option value="auto_approve">
                      {t("workflow.autoApprove")}
                    </option>
                  </select>
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {t("workflow.maxViolations")}
                  </span>
                  <Input type="number" placeholder="3" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddStep(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={() => setShowAddStep(false)}>
                    <Save className="h-4 w-4 mr-2" />
                    {t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* API Configuration Modal */}
        {showApiConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  Cấu hình API -{" "}
                  {apiConfigType === "notify"
                    ? "Thông báo"
                    : "Tự động phê duyệt"}
                </CardTitle>
                <CardDescription>
                  Cấu hình API endpoint cho hành động{" "}
                  {apiConfigType === "notify"
                    ? "thông báo"
                    : "tự động phê duyệt"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiConfigType === "auto_approve" && (
                  <div>
                    <span className="text-sm font-medium">Loại phê duyệt</span>
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="single"
                          checked={approvalType === "single"}
                          onChange={(e) =>
                            handleApprovalTypeChange(
                              e.target.value as "single" | "multiple"
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Phê duyệt 1 lần</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="multiple"
                          checked={approvalType === "multiple"}
                          onChange={(e) =>
                            handleApprovalTypeChange(
                              e.target.value as "single" | "multiple"
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Phê duyệt nhiều lần</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium">URL API</span>
                  <Input
                    value={apiConfigForm.url}
                    onChange={(e) =>
                      setApiConfigForm({
                        ...apiConfigForm,
                        url: e.target.value,
                      })
                    }
                    placeholder={
                      apiConfigType === "notify"
                        ? "https://api.example.com/notify"
                        : "https://api.example.com/approve"
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <span className="text-sm font-medium">HTTP Method</span>
                  <select
                    value={apiConfigForm.method}
                    onChange={(e) =>
                      setApiConfigForm({
                        ...apiConfigForm,
                        method: e.target.value as "POST" | "GET" | "PUT",
                      })
                    }
                    className="w-full mt-1 p-2 border rounded"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>

                <div>
                  <span className="text-sm font-medium">Headers (JSON)</span>
                  <textarea
                    value={apiConfigForm.headers}
                    onChange={(e) =>
                      setApiConfigForm({
                        ...apiConfigForm,
                        headers: e.target.value,
                      })
                    }
                    placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                    className="w-full mt-1 p-2 border rounded h-24 font-mono text-sm"
                  />
                </div>

                <div>
                  <span className="text-sm font-medium">Body (JSON)</span>
                  <textarea
                    value={apiConfigForm.body}
                    onChange={(e) =>
                      setApiConfigForm({
                        ...apiConfigForm,
                        body: e.target.value,
                      })
                    }
                    placeholder='{"message": "SLA violation", "stepId": "step-1", "recordId": "123"}'
                    className="w-full mt-1 p-2 border rounded h-32 font-mono text-sm"
                  />
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Biến có sẵn:</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      <code>{"{stepId}"}</code> - ID của bước hiện tại
                    </div>
                    <div>
                      <code>{"{stepName}"}</code> - Tên bước
                    </div>
                    <div>
                      <code>{"{recordId}"}</code> - ID bản ghi
                    </div>
                    <div>
                      <code>{"{violationCount}"}</code> - Số lần vi phạm
                    </div>
                    <div>
                      <code>{"{slaHours}"}</code> - Giờ SLA
                    </div>
                    <div>
                      <code>{"{timestamp}"}</code> - Thời gian hiện tại
                    </div>
                    {apiConfigType === "auto_approve" && (
                      <>
                        <div>
                          <code>{"{approvalType}"}</code> - Loại phê duyệt (
                          {approvalType === "single" ? "single" : "multiple"})
                        </div>
                        <div>
                          <code>{"{approvalCount}"}</code> - Số lần đã phê duyệt
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowApiConfig(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Hủy
                  </Button>
                  <Button onClick={saveApiConfig}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
