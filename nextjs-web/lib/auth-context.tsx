/**
 * Authentication System - Next.js 14+ App Router
 *
 * ARCHITECTURE OVERVIEW:
 * ====================
 *
 * 1. AUTH FLOW:
 *    - Login: POST /auth/login → Store tokens + user info → Redirect to dashboard
 *    - Logout: POST /auth/logout → Clear tokens → Redirect to login
 *    - Refresh: POST /auth/refresh (auto-handled by axios interceptor)
 *    - Me: GET /auth/me (called to verify tokens and get user info)
 *
 * 2. TOKEN MANAGEMENT:
 *    - Access Token: Stored in localStorage + cookies (1 hour expiry)
 *    - Refresh Token: Stored in localStorage + cookies (7 days expiry)
 *    - Auto-refresh: Axios interceptor handles 401 responses
 *    - Security: Never decode JWT client-side, trust server validation
 *
 * 3. STATE MANAGEMENT:
 *    - Zustand Store: Centralized auth state (auth.store.ts)
 *    - React Context: Provides auth methods to components
 *    - Persisted State: Survives page refreshes
 *
 * 4. ROUTE PROTECTION:
 *    - Middleware: Server-side route guards (middleware.ts)
 *    - ProtectedRoute: Client-side component guards
 *    - Role-based: Admin routes require admin role
 *
 * 5. SECURITY FEATURES:
 *    - No JWT decoding client-side
 *    - HttpOnly-like behavior with secure cookies
 *    - Automatic token cleanup on logout
 *    - Protected routes with role checking
 *
 * USAGE:
 * ======
 *
 * // Check auth status
 * const { isAuthenticated, user, isAdmin } = useAuth();
 *
 * // Login/Logout
 * const { login, logout } = useAuth();
 * await login({ username, password });
 * await logout();
 *
 * // Protect components
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * // Protect pages (layout level)
 * // Use AdminOnly component in admin layout
 *
 * SECURITY NOTES:
 * ==============
 * - Never trust client-side role checks for sensitive operations
 * - Always validate permissions on the server
 * - Use HTTPS in production
 * - Implement rate limiting on auth endpoints
 * - Log security events
 */

"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, useAuthSelectors, type User } from "@/store/auth.store";
import apiClient from "./api-client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isAdmin: false,
  hasRole: () => false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const authStore = useAuthStore();
  const authSelectors = useAuthSelectors();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const { accessToken, user } = authStore;

      // If we have a token but no user, try to get user info
      if (accessToken && !user) {
        try {
          await refreshUser();
        } catch (error) {
          console.warn("Failed to refresh user on init:", error);
          // Clear invalid tokens
          authStore.clearAuth();
        }
      }

      authStore.setLoading(false);
    };

    initializeAuth();
  }, []);

  // Temporarily commented out redirect logic to allow access without login
  // Redirect logic based on auth state
  // useEffect(() => {
  //   const { isAuthenticated, isLoading } = authSelectors;

  //   if (isLoading) return;

  //   const isLoginPage = pathname === '/login';
  //   const isLogoutPage = pathname === '/logout';

  //   if (!isAuthenticated && !isLoginPage && !isLogoutPage) {
  //     // Redirect to login if not authenticated and not on login/logout page
  //     const redirect = pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : '';
  //     router.push(`/login${redirect}`);
  //   } else if (isAuthenticated && isLoginPage) {
  //     // Redirect to dashboard if authenticated and on login page
  //     const redirectParam = new URLSearchParams(window.location.search).get('redirect');
  //     router.push(redirectParam || '/dashboard');
  //   }
  // }, [authSelectors.isAuthenticated, authSelectors.isLoading, pathname, router]);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      authStore.setLoading(true);
      authStore.setError(null);

      // Call through Next.js API proxy instead of direct backend call
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      const { accessToken, refreshToken, user } = data;

      if (!accessToken || !user) {
        throw new Error("Invalid response from server");
      }

      // Store tokens and user
      authStore.login(user, accessToken, refreshToken);

      // Also store in cookies for middleware
      // document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; secure; samesite=strict`;
      // document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800; secure; samesite=strict; httponly`;
      // Thay thế dòng 176-178 bằng:
      const isProduction = process.env.NODE_ENV === 'production';
      const isHttps = window.location.protocol === 'https:';
      const secureFlag = isProduction && isHttps ? '; secure' : '';

      // Cho access token - có thể đọc từ client-side
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400${secureFlag}; samesite=lax`;

      // Cho refresh token - nên httponly để bảo mật hơn
      document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800${secureFlag}; samesite=lax; httponly`;
      toast({
        title: "Đăng nhập thành công",
        description: `Chào mừng ${user.fullName}!`,
      });

      // Redirect to dashboard or intended page
      const redirectParam = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirectParam || '/dashboard');

    } catch (error: any) {
      console.error("Login failed:", error);

      let errorMessage = "Đăng nhập thất bại";

      // Parse error from fetch response or API route
      if (error.message?.includes("401")) {
        errorMessage = "Tên đăng nhập hoặc mật khẩu không đúng";
      } else if (error.message?.includes("423")) {
        errorMessage = "Tài khoản đã bị khóa";
      } else if (error.message?.includes("Login failed")) {
        errorMessage = "Tên đăng nhập hoặc mật khẩu không đúng";
      }

      authStore.setError(errorMessage);
      toast({
        title: "Đăng nhập thất bại",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      authStore.setLoading(false);
    }
  };

  const logout = async () => {
    try {
      authStore.setLoading(true);

      const { refreshToken } = authStore;
      if (refreshToken) {
        try {
          await apiClient.post("/auth/logout", { refreshToken });
        } catch (error) {
          console.warn("Server logout failed, proceeding with client logout:", error);
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear client-side auth state
      authStore.clearAuth();

      // Clear cookies
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      toast({
        title: "Đã đăng xuất",
        description: "Bạn đã đăng xuất thành công.",
      });

      router.push("/login");
      authStore.setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get("/auth/me");
      const user = response.data;
      authStore.setUser(user);
    } catch (error) {
      console.error("Failed to refresh user:", error);
      throw error;
    }
  };

  const clearError = () => {
    authStore.setError(null);
  };

  const contextValue: AuthContextType = {
    user: authSelectors.user,
    isAuthenticated: authSelectors.isAuthenticated,
    isLoading: authSelectors.isLoading,
    error: authSelectors.error,
    isAdmin: authSelectors.isAdmin,
    hasRole: authSelectors.hasRole,
    login,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
