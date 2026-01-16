"use client";

import { AdminOnly } from "@/components/ProtectedRoute";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminOnly>
      {children}
    </AdminOnly>
  );
}
