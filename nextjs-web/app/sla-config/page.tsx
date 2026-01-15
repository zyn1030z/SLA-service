"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/use-translation";
import { apiClient } from "@/lib/api/client";
import {
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X,
  Workflow,
  Activity,
} from "lucide-react";

interface Workflow {
  id: number;
  workflowName: string;
  model: string;
  activities: Activity[];
}

interface Activity {
  id: number;
  name: string;
  code: string;
  slaHours: number;
  violationAction: "notify" | "auto_approve";
  maxViolations: number;
  isActive: boolean;
  notifyApiConfig?: {
    url: string;
    method: "POST" | "GET" | "PUT";
    headers: Record<string, string>;
    body?: string;
  };
  autoApproveApiConfig?: {
    approvalType: "single" | "multiple";
    singleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: string;
    };
    multipleApprovalConfig?: {
      url: string;
      method: "POST" | "GET" | "PUT";
      headers: Record<string, string>;
      body?: string;
    };
  };
}

export default function SLAConfigPage() {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      console.log("[SLAConfigPage] Fetching workflows...");
      const response = await apiClient.getWorkflows();
      console.log("[SLAConfigPage] API response:", response);

      if (response.success && response.data) {
        // Handle different response structures like useSystemManagement hook
        const workflowsArray = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.data && Array.isArray((response.data as any).data)
          ? (response.data as any).data
          : null;

        if (workflowsArray) {
          // Ensure activities is always an array
          const workflowsWithActivities = workflowsArray.map((workflow: any) => ({
            ...workflow,
            activities: workflow.activities || []
          }));

          setWorkflows(workflowsWithActivities);
          console.log(`[SLAConfigPage] Loaded ${workflowsWithActivities.length} workflows`);
        } else {
          console.warn("[SLAConfigPage] No workflows found in response");
          setWorkflows([]);
        }
      } else {
        console.error("[SLAConfigPage] API call failed:", response.error);
        setWorkflows([]);
      }
    } catch (error) {
      console.error("[SLAConfigPage] Error fetching workflows:", error);
    } finally {
      setLoading(false);
      console.log("[SLAConfigPage] Loading set to false");
    }
  }, []);

  useEffect(() => {
    console.log("[SLAConfigPage] useEffect fetching workflows");
    fetchWorkflows();
  }, [fetchWorkflows]);

  const updateActivity = async (activityId: number, updates: Partial<Activity>) => {
    try {
      const response = await fetch(`/api/workflows/activity/${activityId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchWorkflows(); // Refresh data
        // Delay closing dialog to prevent scroll to top
        setTimeout(() => {
          setIsEditDialogOpen(false);
          setSelectedActivity(null);
          // Restore scroll position
          window.scrollTo(0, scrollPosition);
        }, 100);
      }
    } catch (error) {
      console.error("Error updating activity:", error);
    }
  };

  const getViolationActionColor = (action: string) => {
    switch (action) {
      case "notify":
        return "bg-blue-100 text-blue-800";
      case "auto_approve":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getViolationActionText = (action: string) => {
    switch (action) {
      case "notify":
        return "Thông báo";
      case "auto_approve":
        return "Tự động phê duyệt";
      default:
        return action;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cấu hình quy tắc SLA</h1>
          <p className="text-muted-foreground">
            Quản lý thời gian SLA và hành động vi phạm cho các workflow
          </p>
          <div className="mt-2">
            <Button onClick={fetchWorkflows} variant="outline" size="sm">
              Refresh Data ({workflows.length} workflows loaded)
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có workflow nào</h3>
            <p className="text-muted-foreground text-center">
              Bạn cần tạo workflow và activities trước khi cấu hình SLA rules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  {workflow.workflowName}
                  <Badge variant="outline">{workflow.model}</Badge>
                </CardTitle>
                <CardDescription>
                  {workflow.activities?.length || 0} activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>SLA (giờ)</TableHead>
                      <TableHead>Hành động vi phạm</TableHead>
                      <TableHead>Max vi phạm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>API Config</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflow.activities && workflow.activities.length > 0 ? workflow.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              {activity.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {activity.code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            {activity.slaHours}h
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getViolationActionColor(activity.violationAction)}>
                            {getViolationActionText(activity.violationAction)}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.maxViolations}</TableCell>
                        <TableCell>
                          <Badge variant={activity.isActive ? "default" : "secondary"}>
                            {activity.isActive ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {activity.notifyApiConfig && (
                              <Badge variant="outline" className="text-xs">
                                Notify
                              </Badge>
                            )}
                            {activity.autoApproveApiConfig && (
                              <Badge variant="outline" className="text-xs">
                                Auto-approve
                              </Badge>
                            )}
                            {!activity.notifyApiConfig && !activity.autoApproveApiConfig && (
                              <span className="text-muted-foreground text-xs">Chưa cấu hình</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setScrollPosition(window.scrollY);
                              setSelectedActivity(activity);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Chỉnh sửa
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Không có activities nào trong workflow này
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Activity Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cấu hình SLA cho Activity</DialogTitle>
            <DialogDescription>
              {selectedActivity && `${selectedActivity.name} (${selectedActivity.code})`}
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <ActivityConfigForm
              activity={selectedActivity}
              onSave={(updates) => updateActivity(selectedActivity.id, updates)}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Activity Configuration Form Component
function ActivityConfigForm({
  activity,
  onSave,
  onCancel,
}: {
  activity: Activity;
  onSave: (updates: Partial<Activity>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Activity>>(activity);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof Activity, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateApiConfig = (type: 'notify' | 'autoApprove', field: string, value: any) => {
    const configKey = type === 'notify' ? 'notifyApiConfig' : 'autoApproveApiConfig';
    setFormData(prev => ({
      ...prev,
      [configKey]: {
        ...prev[configKey],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slaHours">Thời gian SLA (giờ)</Label>
          <Input
            id="slaHours"
            type="number"
            value={formData.slaHours || 24}
            onChange={(e) => updateFormData('slaHours', parseInt(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxViolations">Số vi phạm tối đa</Label>
          <Input
            id="maxViolations"
            type="number"
            value={formData.maxViolations || 3}
            onChange={(e) => updateFormData('maxViolations', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="violationAction">Hành động khi vi phạm</Label>
        <Select
          value={formData.violationAction || "notify"}
          onValueChange={(value: "notify" | "auto_approve") =>
            updateFormData('violationAction', value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notify">Thông báo</SelectItem>
            <SelectItem value="auto_approve">Tự động phê duyệt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* API Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Cấu hình API</h3>

        {/* Notification API */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">API Thông báo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="notifyUrl">URL</Label>
                <Input
                  id="notifyUrl"
                  value={formData.notifyApiConfig?.url || ""}
                  onChange={(e) => updateApiConfig('notify', 'url', e.target.value)}
                  placeholder="https://api.example.com/notify"
                />
              </div>
              <div>
                <Label htmlFor="notifyMethod">Method</Label>
                <Select
                  value={formData.notifyApiConfig?.method || "POST"}
                  onValueChange={(value) => updateApiConfig('notify', 'method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notifyBody">Request Body (JSON)</Label>
              <Textarea
                id="notifyBody"
                value={formData.notifyApiConfig?.body || ""}
                onChange={(e) => updateApiConfig('notify', 'body', e.target.value)}
                placeholder='{"message": "SLA violation detected", "recordId": "{recordId}"}'
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-approve API */}
        {formData.violationAction === "auto_approve" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">API Tự động phê duyệt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="approveUrl">URL</Label>
                  <Input
                    id="approveUrl"
                    value={formData.autoApproveApiConfig?.singleApprovalConfig?.url || ""}
                    onChange={(e) => updateApiConfig('autoApprove', 'singleApprovalConfig.url', e.target.value)}
                    placeholder="https://api.example.com/approve"
                  />
                </div>
                <div>
                  <Label htmlFor="approveMethod">Method</Label>
                  <Select
                    value={formData.autoApproveApiConfig?.singleApprovalConfig?.method || "POST"}
                    onValueChange={(value) => updateApiConfig('autoApprove', 'singleApprovalConfig.method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="approveBody">Request Body (JSON)</Label>
                <Textarea
                  id="approveBody"
                  value={formData.autoApproveApiConfig?.singleApprovalConfig?.body || ""}
                  onChange={(e) => updateApiConfig('autoApprove', 'singleApprovalConfig.body', e.target.value)}
                  placeholder='{"action": "approve", "recordId": "{recordId}"}'
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Hủy
        </Button>
        <Button onClick={handleSave} disabled={loading} type="button">
          <Save className="h-4 w-4 mr-1" />
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogFooter>
    </div>
  );
}
