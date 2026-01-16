"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  roleCode?: string;
  isActive?: boolean;
}

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

// Validation schema
const userFormSchema = z.object({
  username: z.string()
    .min(1, "Vui lòng nhập tên đăng nhập")
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
    .max(50, "Tên đăng nhập không được quá 50 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới"),
  fullName: z.string()
    .min(1, "Vui lòng nhập họ tên")
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(100, "Họ tên không được quá 100 ký tự"),
  email: z.string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z.string()
    .optional()
    .refine((val) => {
      // Password is required for new users, optional for existing users
      return val === undefined || val === "" || val.length >= 6;
    }, "Mật khẩu phải có ít nhất 6 ký tự"),
  roleCode: z.enum(["admin", "user"], {
    required_error: "Vui lòng chọn quyền",
  }),
});

type UserFormData = z.infer<typeof userFormSchema>;

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      roleCode: "user",
    },
  });

  // Watch password field to show validation only when user types
  const passwordValue = watch("password");

  useEffect(() => {
    if (user) {
      // Edit mode - don't set password
      reset({
        username: user.username || "",
        fullName: user.fullName || "",
        email: user.email || "",
        password: "",
        roleCode: (user.roleCode || user.role || "user") as "admin" | "user",
      });
    } else {
      // Create mode
      reset({
        username: "",
        fullName: "",
        email: "",
        password: "",
        roleCode: "user",
      });
    }
  }, [user, open, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (user) {
        // Edit user
        const payload: any = {
          fullName: data.fullName,
          email: data.email,
          roleCode: data.roleCode,
        };
        // Only include password if it was changed
        if (data.password && data.password.trim() !== "") {
          payload.password = data.password;
        }

        await apiClient.put(`/admin/users/${user.id}`, payload);
        toast({
          title: "Cập nhật thành công",
          description: `Người dùng ${data.username} đã được cập nhật.`,
        });
      } else {
        // Create user
        await apiClient.post("/admin/users", data);
        toast({
          title: "Tạo người dùng thành công",
          description: `Người dùng ${data.username} đã được tạo.`,
        });
      }

      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("Failed to save user", error);

      let errorMessage = "Có lỗi xảy ra khi lưu người dùng";

      if (error.response?.status === 409) {
        errorMessage = "Tên đăng nhập hoặc email đã tồn tại";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Tên đăng nhập
            </Label>
            <div className="col-span-3">
              <Input
                id="username"
                {...register("username")}
                disabled={!!user || isSubmitting} // Username immutable on edit
                placeholder="Nhập tên đăng nhập"
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fullName" className="text-right">
              Họ tên
            </Label>
            <div className="col-span-3">
              <Input
                id="fullName"
                {...register("fullName")}
                disabled={isSubmitting}
                placeholder="Nhập họ tên đầy đủ"
              />
              {errors.fullName && (
                <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <div className="col-span-3">
              <Input
                id="email"
                type="email"
                {...register("email")}
                disabled={isSubmitting}
                placeholder="Nhập địa chỉ email"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="roleCode" className="text-right">
              Quyền
            </Label>
            <div className="col-span-3">
              <Select
                value={watch("roleCode")}
                onValueChange={(value) => setValue("roleCode", value as "admin" | "user")}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn quyền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Người dùng</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
              {errors.roleCode && (
                <p className="text-sm text-red-600 mt-1">{errors.roleCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Mật khẩu
            </Label>
            <div className="col-span-3">
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isSubmitting}
                placeholder={user ? "(Để trống nếu không đổi)" : "Nhập mật khẩu"}
              />
              {errors.password && passwordValue && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
              {user && !passwordValue && (
                <p className="text-xs text-muted-foreground mt-1">
                  Để trống để giữ mật khẩu hiện tại
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
