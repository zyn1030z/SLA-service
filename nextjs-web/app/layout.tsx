"use client";
import "./globals.css";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Workflow, FileText, Globe, Bell } from "lucide-react";
import { useTranslation } from "@/lib/use-translation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">
                      SLA
                    </span>
                  </div>
                  <span className="font-bold text-lg">SLA Monitor</span>
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    {t("navigation.dashboard")}
                  </Button>
                </Link>
                <Link href="/workflows">
                  <Button variant="ghost" size="sm">
                    <Workflow className="h-4 w-4 mr-2" />
                    {t("navigation.workflows")}
                  </Button>
                </Link>
                <Link href="/systems">
                  <Button variant="ghost" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Hệ thống
                  </Button>
                </Link>
                <Link href="/records">
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    {t("navigation.records")}
                  </Button>
                </Link>
                <Link href="/sla-action-logs">
                  <Button variant="ghost" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    {t("navigation.slaLogs")}
                  </Button>
                </Link>
                <div className="flex items-center space-x-1 ml-4">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant={language === "en" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setLanguage("en")}
                  >
                    EN
                  </Button>
                  <Button
                    variant={language === "vi" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setLanguage("vi")}
                  >
                    VI
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
