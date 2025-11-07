"use client";
import React, { useEffect, useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      setRecords([
        {
          id: "1",
          recordId: "PO-12345",
          model: "purchase.order",
          workflowName: "Purchase Order Approval",
          stepCode: "manager_approval",
          stepName: "Manager Approval",
          startTime: "2025-10-20T08:00:00Z",
          status: "waiting",
          violationCount: 0,
          slaHours: 24,
          remainingHours: 18,
        },
        {
          id: "2",
          recordId: "EXP-67890",
          model: "hr.expense",
          workflowName: "Expense Report",
          stepCode: "supervisor_approval",
          stepName: "Supervisor Approval",
          startTime: "2025-10-19T14:30:00Z",
          status: "violated",
          violationCount: 2,
          slaHours: 12,
          remainingHours: -3,
        },
        {
          id: "3",
          recordId: "PO-54321",
          model: "purchase.order",
          workflowName: "Purchase Order Approval",
          stepCode: "finance_review",
          stepName: "Finance Review",
          startTime: "2025-10-20T10:15:00Z",
          status: "completed",
          violationCount: 0,
          slaHours: 48,
          remainingHours: 0,
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredRecords = records.filter(
    (record) =>
      record.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.stepName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getRemainingTime = (remainingHours: number) => {
    if (remainingHours < 0) {
      return (
        <span className="text-destructive font-medium">
          {Math.abs(remainingHours)}h {t("records.overdue")}
        </span>
      );
    } else if (remainingHours === 0) {
      return (
        <span className="text-muted-foreground">{t("records.completed")}</span>
      );
    } else {
      return (
        <span className="text-blue-600 font-medium">
          {remainingHours}h {t("records.remaining")}
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
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.recordId}
                      </TableCell>
                      <TableCell>{record.workflowName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.stepName}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.stepCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status, record.violationCount)}
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
                        {new Date(record.startTime).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                          {new Date(record.startTime).toLocaleString()}
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
                          {Math.abs(record.remainingHours)}h{" "}
                          {t("records.overdue")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(record.startTime).toLocaleString()}
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
                          {new Date(record.startTime).toLocaleString()}
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
