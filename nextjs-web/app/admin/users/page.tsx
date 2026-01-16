"use client";

import React, { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/admin/user-form";
import { UserTable } from "@/components/admin/user-table";
import { UserPlus } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roleCode: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleLock = async (user: User) => {
    try {
      if (user.isLocked) {
        await apiClient.post(`/admin/users/${user.id}/unlock`);
      } else {
        await apiClient.post(`/admin/users/${user.id}/lock`);
      }
      fetchUsers();
    } catch (error) {
       console.error("Lock/Unlock failed", error);
    }
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Are you sure you want to deactivate user ${user.username}?`)) {
      try {
        await apiClient.delete(`/admin/users/${user.id}`);
        fetchUsers();
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage system users and access controls.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <UserTable 
        users={users} 
        loading={loading} 
        onEdit={handleEdit} 
        onLock={handleLock} 
        onDelete={handleDelete}
      />
      
      <UserForm 
         open={dialogOpen} 
         onOpenChange={setDialogOpen} 
         user={selectedUser} 
         onSuccess={fetchUsers} 
      />
    </div>
  );
}
