"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/use-translation";
import { AdminOnly } from "@/components/ProtectedRoute";
import { FileText, Download, CheckCircle, AlertTriangle, TrendingUp, Eye, X } from "lucide-react";

interface SLAReport {
  userId: number;
  userName: string;
  userLogin: string;
  totalRecords: number;
  completedRecords: number;
  violatedRecords: number;
  pendingRecords: number;
  successRate: number;
  avgCompletionTime: number;
}

interface UserRecord {
  id: number;
  recordId: string;
  model: string;
  workflowName?: string;
  stepName?: string;
  status: "waiting" | "violated" | "completed";
  createdAt: string;
  updatedAt: string;
  violationCount: number;
  remainingHours: number;
}

function SLAReportsPage() {
  const { t } = useTranslation();
  const [reportData, setReportData] = useState<SLAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SLAReport | null>(null);
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [userRecordsLoading, setUserRecordsLoading] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports/sla");
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const exportReport = async (format: "pdf" | "excel") => {
    try {
      const response = await fetch(`/api/reports/sla/export?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sla-report.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  };

  const fetchUserRecords = async (user: SLAReport) => {
    setUserRecordsLoading(true);
    try {
      // Fetch records for this user (last 30 days to match report data)
      const response = await fetch(`/api/records?userId=${user.userId}&days=30`);
      if (response.ok) {
        const data = await response.json();
        setUserRecords(data.items || []);
        setSelectedUser(user);
        setShowUserDetail(true);
      }
    } catch (error) {
      console.error("Error fetching user records:", error);
    } finally {
      setUserRecordsLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "bg-green-100 text-green-800";
    if (rate >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Báo cáo SLA</h1>
          <p className="text-muted-foreground">
            Báo cáo hiệu suất SLA theo người dùng
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportReport("excel")}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport("pdf")}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Xuất PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng số bản ghi
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.reduce((sum, user) => sum + user.totalRecords, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đã hoàn thành
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reportData.reduce((sum, user) => sum + user.completedRecords, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vi phạm SLA
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {reportData.reduce((sum, user) => sum + user.violatedRecords, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tỷ lệ thành công
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reportData.length > 0
                ? Math.round(
                    (reportData.reduce((sum, user) => sum + user.completedRecords, 0) /
                      reportData.reduce((sum, user) => sum + user.totalRecords, 0)) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết báo cáo theo người dùng</CardTitle>
          <CardDescription>
            Hiệu suất SLA của từng người dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Tổng bản ghi</TableHead>
                <TableHead>Đã hoàn thành</TableHead>
                <TableHead>Vi phạm SLA</TableHead>
                <TableHead>Đang xử lý</TableHead>
                <TableHead>Tỷ lệ thành công</TableHead>
                <TableHead>Thời gian TB (giờ)</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Không có dữ liệu báo cáo
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.userLogin}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.totalRecords}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {user.completedRecords}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {user.violatedRecords}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.pendingRecords}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSuccessRateColor(user.successRate)}>
                        <span>{user.successRate}%</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{Number(user.avgCompletionTime).toFixed(1)}h</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUserRecords(user)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết records của {selectedUser?.userName} ({selectedUser?.userLogin})
            </DialogTitle>
            <DialogDescription>
              Tổng quan các records trong 30 ngày gần nhất
            </DialogDescription>
          </DialogHeader>

          {userRecordsLoading ? (
            <div className="text-center py-8">Đang tải dữ liệu...</div>
          ) : (
            <div className="space-y-6">
              {/* Violated Records */}
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Records vi phạm SLA ({userRecords.filter(r => r.status === 'violated').length})
                </h3>
                {userRecords.filter(r => r.status === 'violated').length > 0 ? (
                  <div className="space-y-2">
                    {userRecords.filter(r => r.status === 'violated').map((record) => (
                      <Card key={record.id} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">Record ID: {record.recordId}</div>
                              <div className="text-sm text-muted-foreground">
                                Model: {record.model}
                                {record.workflowName && ` • Workflow: ${record.workflowName}`}
                                {record.stepName && ` • Step: ${record.stepName}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Tạo: {new Date(record.createdAt).toLocaleString('vi-VN')}
                                • Cập nhật: {new Date(record.updatedAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="destructive">
                                Vi phạm SLA
                              </Badge>
                              <div className="text-sm text-muted-foreground mt-1">
                                Còn lại: {Number(record.remainingHours).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Không có records vi phạm SLA
                  </div>
                )}
              </div>

              {/* Completed Records */}
              <div>
                <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Records đã hoàn thành ({userRecords.filter(r => r.status === 'completed').length})
                </h3>
                {userRecords.filter(r => r.status === 'completed').length > 0 ? (
                  <div className="space-y-2">
                    {userRecords.filter(r => r.status === 'completed').map((record) => (
                      <Card key={record.id} className="border-green-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">Record ID: {record.recordId}</div>
                              <div className="text-sm text-muted-foreground">
                                Model: {record.model}
                                {record.workflowName && ` • Workflow: ${record.workflowName}`}
                                {record.stepName && ` • Step: ${record.stepName}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Tạo: {new Date(record.createdAt).toLocaleString('vi-VN')}
                                • Cập nhật: {new Date(record.updatedAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-100 text-green-800">
                                Đã hoàn thành
                              </Badge>
                              <div className="text-sm text-muted-foreground mt-1">
                                Còn lại: {Number(record.remainingHours).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Không có records đã hoàn thành
                  </div>
                )}
              </div>

              {/* Pending Records */}
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Records đang xử lý ({userRecords.filter(r => r.status === 'waiting').length})
                </h3>
                {userRecords.filter(r => r.status === 'waiting').length > 0 ? (
                  <div className="space-y-2">
                    {userRecords.filter(r => r.status === 'waiting').map((record) => (
                      <Card key={record.id} className="border-yellow-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">Record ID: {record.recordId}</div>
                              <div className="text-sm text-muted-foreground">
                                Model: {record.model}
                                {record.workflowName && ` • Workflow: ${record.workflowName}`}
                                {record.stepName && ` • Step: ${record.stepName}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Tạo: {new Date(record.createdAt).toLocaleString('vi-VN')}
                                • Cập nhật: {new Date(record.updatedAt).toLocaleString('vi-VN')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                Đang xử lý
                              </Badge>
                              <div className="text-sm text-muted-foreground mt-1">
                                Còn lại: {Number(record.remainingHours).toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Không có records đang xử lý
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AdminOnly>
      <SLAReportsPage />
    </AdminOnly>
  );
}
