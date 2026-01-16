"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Calendar,
  LogOut,
  Settings,
  Users,
  FileText,
  Activity,
  Bell
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function DashboardPage() {
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Quản trị viên';
      case 'user':
        return 'Người dùng';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Xin chào, {user.fullName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Chào mừng bạn quay trở lại hệ thống SLA Monitor
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>

      {/* User Info Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin tài khoản
            </CardTitle>
            <CardDescription>
              Thông tin cá nhân và quyền truy cập của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{user.fullName}</h3>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleColor(user.role)} className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {getRoleDisplayName(user.role)}
                  </Badge>
                  {isAdmin && (
                    <Badge variant="outline" className="text-xs">
                      Admin Access
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Trạng thái tài khoản</span>
              <Badge variant="default">Hoạt động</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Đăng nhập cuối</span>
              <span className="text-sm text-muted-foreground">
                {user.lastLoginAt
                  ? format(new Date(user.lastLoginAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                  : 'Chưa có thông tin'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quyền truy cập</span>
              <span className="text-sm text-muted-foreground">
                {isAdmin ? 'Đầy đủ' : 'Giới hạn'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Truy cập nhanh</CardTitle>
          <CardDescription>
            Các chức năng chính của hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/records">
                <FileText className="h-6 w-6" />
                <span className="text-sm">Quản lý bản ghi</span>
              </a>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/workflows">
                <Activity className="h-6 w-6" />
                <span className="text-sm">Quy trình</span>
              </a>
            </Button>

            <Button variant="outline" className="h-20 flex-col gap-2" asChild>
              <a href="/sla-action-logs">
                <Bell className="h-6 w-6" />
                <span className="text-sm">Lịch sử SLA</span>
              </a>
            </Button>

            {isAdmin && (
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <a href="/admin/users">
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Quản lý người dùng</span>
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
          <CardDescription>
            Các hoạt động gần đây trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có hoạt động nào để hiển thị</p>
            <p className="text-sm">Các hoạt động sẽ xuất hiện ở đây khi bạn sử dụng hệ thống</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
