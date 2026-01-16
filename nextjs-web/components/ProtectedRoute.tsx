"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
  showUnauthorized?: boolean;
}

/**
 * Component bảo vệ route với kiểm tra xác thực và phân quyền
 * - Kiểm tra đăng nhập
 * - Kiểm tra quyền truy cập (role-based)
 * - Hiển thị loading state
 * - Hiển thị unauthorized message nếu cần
 */
export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
  showUnauthorized = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();

  // Hiển thị loading khi đang kiểm tra auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  // Kiểm tra quyền nếu có yêu cầu
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.some(role => hasRole(role));

    if (!hasRequiredRole) {
      if (showUnauthorized) {
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <Alert className="max-w-md">
              <AlertDescription className="space-y-4">
                <div>
                  <h3 className="font-medium text-destructive">Không có quyền truy cập</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bạn cần quyền {Array.isArray(requiredRole) ? requiredRole.join(' hoặc ') : requiredRole} để truy cập trang này.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                    Quay lại
                  </Button>
                  <Button size="sm" onClick={() => window.location.href = '/dashboard'}>
                    Về trang chủ
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      if (fallback) return <>{fallback}</>;
      return null;
    }
  }

  // Có quyền truy cập, render children
  return <>{children}</>;
}

/**
 * Higher-order component cho việc bảo vệ route
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Component bảo vệ route chỉ dành cho admin
 */
export function AdminOnly({ children, ...props }: ProtectedRouteProps) {
  return (
    <ProtectedRoute requiredRole="admin" {...props}>
      {children}
    </ProtectedRoute>
  );
}
