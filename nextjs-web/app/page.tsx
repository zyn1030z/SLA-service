"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
    axios
      .get(`${base}/dashboard/summary`)
      .then((r) => setSummary(r.data))
      .catch(() =>
        setSummary({ totalViolations: 0, activeRecords: 0, completedToday: 0 })
      )
      .finally(() => setLoading(false));
  }, []);

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
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button>{t("common.refresh")}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.totalViolations")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summary?.totalViolations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.violationsDetected")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.activeRecords")}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.activeRecords ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.currentlyTracked")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.completedToday")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.completedToday ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.successfullyProcessed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.successRate")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.successRate ?? "95"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.slaComplianceRate")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentViolations")}</CardTitle>
            <CardDescription>{t("dashboard.latestViolations")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Purchase Order #12345</p>
                  <p className="text-xs text-muted-foreground">
                    Manager Approval
                  </p>
                </div>
                <Badge variant="destructive">2 hours overdue</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Expense Report #67890</p>
                  <p className="text-xs text-muted-foreground">
                    Finance Review
                  </p>
                </div>
                <Badge variant="destructive">1 hour overdue</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.commonTasks")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/workflows">
              <Button className="w-full justify-start" variant="outline">
                {t("dashboard.viewAllWorkflows")}
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              {t("dashboard.exportReports")}
            </Button>
            <Button className="w-full justify-start" variant="outline">
              {t("dashboard.configureSlaRules")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
