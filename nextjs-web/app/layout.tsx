"use client";
import "./globals.css";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Workflow,
  FileText,
  Globe,
  Bell,
  Menu,
  X,
  ChevronRight,
  Activity
} from "lucide-react";
import { useTranslation } from "@/lib/use-translation";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth-context";

const navigation = [
  {
    name: "navigation.dashboard",
    href: "/",
    icon: Home,
    description: "Tổng quan hệ thống SLA",
  },
  {
    name: "navigation.records",
    href: "/records",
    icon: FileText,
    description: "Quản lý và theo dõi bản ghi",
  },
  {
    name: "navigation.workflows",
    href: "/workflows",
    icon: Workflow,
    description: "Cấu hình quy trình phê duyệt",
  },
  {
    name: "navigation.systems",
    href: "/systems",
    icon: Globe,
    description: "Quản lý hệ thống kết nối",
  },
  {
    name: "navigation.slaLogs",
    href: "/sla-action-logs",
    icon: Bell,
    description: "Lịch sử hành động SLA",
  },
];

function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SLA Monitor</h1>
            <p className="text-xs text-muted-foreground">Service Level Agreement</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <div className="flex-1">
                <div className="font-medium">{t(item.name)}</div>
                <div className="text-xs text-muted-foreground mt-0.5 hidden lg:block">
                  {item.description}
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform opacity-0 group-hover:opacity-100",
                  isActive ? "opacity-100 rotate-90" : ""
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            SLA Monitor v2.0
          </div>
          <Badge variant="secondary" className="text-xs">
            Beta
          </Badge>
        </div>
      </div>
    </div>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center space-x-1 p-2 bg-muted/30 rounded-lg">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Button
        variant={language === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="h-8 px-2"
      >
        EN
      </Button>
      <Button
        variant={language === "vi" ? "default" : "ghost"}
        size="sm"
        onClick={() => setLanguage("vi")}
        className="h-8 px-2"
      >
        VI
      </Button>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="vi">
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>
        <div className="flex h-screen">
          {/* Desktop Sidebar */}
          {!isLoginPage && (
          <div className="hidden lg:flex lg:w-80 lg:flex-col lg:border-r lg:bg-card/50">
            <Sidebar />
          </div>
          )}

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && !isLoginPage && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-80 bg-card shadow-xl transform transition-transform duration-300">
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Header */}
            {!isLoginPage && (
            <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="ml-4 lg:hidden">
                  <h1 className="text-lg font-semibold">SLA Monitor</h1>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Language switcher hidden in UI but kept mounted to preserve i18n state */}
                <div className="hidden">
                  <LanguageSwitcher />
                </div>
              </div>
            </header>
            )}

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              <div className={cn("max-w-full", !isLoginPage && "px-2 lg:px-4 py-8")}>
                {children}
              </div>
            </main>
          </div>
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
