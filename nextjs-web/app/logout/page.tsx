"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
        // Even if logout fails, redirect to login
        router.push("/login");
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Đang đăng xuất...</h2>
        <p className="text-muted-foreground">Vui lòng chờ trong giây lát</p>
      </div>
    </div>
  );
}
