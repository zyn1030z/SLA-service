"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Activity, Mail, User, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect is handled by Middleware, but we can show loading state here
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải thông tin...</div>;
  }

  if (!isAuthenticated || !user) {
     // Fallback UI if middleware didn't redirect yet (react hydration gap)
     return <div className="p-8 text-center text-muted-foreground">Vui lòng đăng nhập để xem thông tin này.</div>;
  }

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
           <Activity className="h-8 w-8 text-white" />
        </div>
        <div>
           <h1 className="text-3xl font-bold text-gray-900">Thông tin cá nhân</h1>
           <p className="text-gray-600">Quản lý thông tin tài khoản của bạn</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
           <div className="flex items-center space-x-4">
             <Avatar className="h-20 w-20 border-2 border-white shadow-md">
                 <AvatarImage src="" />
                 <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(user.fullName || "User")}
                 </AvatarFallback>
             </Avatar>
             <div>
                 <CardTitle className="text-xl">{user.fullName}</CardTitle>
                 <CardDescription>{user.email}</CardDescription>
                 <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {user.role}
                    </Badge>
                     <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Hoạt động" : "Bị khóa"}
                    </Badge>
                 </div>
             </div>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                     <Label className="flex items-center gap-2">
                         <User className="h-4 w-4 text-muted-foreground" />
                         Tên đăng nhập
                     </Label>
                     <Input value={user.username} readOnly className="bg-muted/50" />
                 </div>
                 <div className="space-y-2">
                     <Label className="flex items-center gap-2">
                         <Mail className="h-4 w-4 text-muted-foreground" />
                         Email
                     </Label>
                     <Input value={user.email} readOnly className="bg-muted/50" />
                 </div>
                 <div className="space-y-2 md:col-span-2">
                     <Label>Họ và tên</Label>
                     <Input value={user.fullName} readOnly className="bg-muted/50" />
                 </div>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
