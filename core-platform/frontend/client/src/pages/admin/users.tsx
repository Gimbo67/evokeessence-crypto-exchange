import { useUser } from "@/hooks/use-user";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserGroup } from "@db/schema";
import { useTranslations } from "@/lib/language-context";
import { Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  username: string;
  email: string;
  isEmployee: boolean;
  isAdmin: boolean;
  userGroup: string;
  kycStatus: string;
  is_blocked?: boolean;
}

const USER_GROUPS = [
  { value: UserGroup.KYC_EMPLOYEE, label: "KYC Specialist" },
  { value: UserGroup.FINANCE_EMPLOYEE, label: "Finance Officer" },
  { value: UserGroup.VIEWONLY_EMPLOYEE, label: "View Only" },
  { value: UserGroup.SECOND_RANK_ADMIN, label: "Second Rank Admin" },
  { value: UserGroup.CLIENT, label: "Client" }
];

export default function UsersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [editedUsers, setEditedUsers] = useState<{[key: number]: User}>({});
  const t = useTranslations();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
    enabled: !!user?.isAdmin
  });

  const filteredUsers = users.filter(user =>
    selectedRole === "all" || 
    (selectedRole === "employee" && user.isEmployee) ||
    (selectedRole === "client" && !user.isEmployee && !user.isAdmin)
  );

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, isEmployee }: { userId: number; isEmployee: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEmployee }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: t('dashboard_role_updated'),
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Deletion failed: ${errorText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: t('dashboard_user_deleted'),
      });
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, reason, notes }: { userId: number; reason: string; notes?: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: "User blocked successfully",
      });
    }
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: "User unblocked successfully",
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updatedUser: User) => {
      const res = await fetch(`/api/admin/users/${updatedUser.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedUser),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update user");
      }

      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["admin-users"] });
      setEditedUsers({});
      toast({
        title: "Success",
        description: t('dashboard_user_updated'),
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateUser = useMutation({
    mutationFn: async (variables: { id: number; data: Partial<User> }) => {
      const res = await fetch(`/api/admin/users/${variables.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...variables.data,
          userGroup: variables.data.userGroup || undefined // Handle undefined userGroup
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update user");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: t("success"),
        description: t("user_updated_successfully"),
      });
      setEditedUsers(prev => {
        const {[variables.id]: _, ...rest} = prev;
        return rest;
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });


  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6 mt-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">{t('dashboard_users')}</h2>
        <div className="flex items-center gap-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('dashboard_select_role')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard_all_users')}</SelectItem>
              <SelectItem value="employee">{t('dashboard_employees')}</SelectItem>
              <SelectItem value="client">{t('dashboard_clients')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('auth_username')}</TableHead>
                <TableHead>{t('auth_email')}</TableHead>
                <TableHead>{t('dashboard_role')}</TableHead>
                <TableHead>{t('dashboard_group')}</TableHead>
                <TableHead>{t('dashboard_kyc_status')}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {editedUsers[user.id] ? (
                        <>
                          <input 
                            type="text" 
                            value={editedUsers[user.id].username || user.username} 
                            className="px-2 py-1 border rounded bg-black text-white w-full" 
                            onChange={(e) => {
                              const newUser = {...editedUsers[user.id] || user, username: e.target.value};
                              setEditedUsers(prev => ({...prev, [user.id]: newUser}));
                            }} 
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              updateUser.mutate({id: user.id, data: editedUsers[user.id]});
                            }}
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <span className="min-w-[120px]" onClick={() => setEditedUsers(prev => ({...prev, [user.id]: {...user}}))}>{user.username}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {editedUsers[user.id] ? (
                        <>
                          <input 
                            type="email" 
                            value={editedUsers[user.id].email || user.email} 
                            className="px-2 py-1 border rounded bg-black text-white w-full" 
                            onChange={(e) => {
                              const newUser = {...editedUsers[user.id] || user, email: e.target.value};
                              setEditedUsers(prev => ({...prev, [user.id]: newUser}));
                            }} 
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              updateUser.mutate({id: user.id, data: editedUsers[user.id]});
                            }}
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <span className="min-w-[180px]" onClick={() => setEditedUsers(prev => ({...prev, [user.id]: {...user}}))}>{user.email}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isEmployee}
                        onCheckedChange={(checked) => {
                          updateRoleMutation.mutate({
                            userId: user.id,
                            isEmployee: checked
                          });
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {user.isEmployee ? t('dashboard_employee') : t('dashboard_client')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={user.userGroup} onValueChange={(value) => {
                      updateUser.mutate({id: user.id, data: {...user, userGroup: value}});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_GROUPS.map(group => (
                          <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{user.kycStatus || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.is_blocked ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => unblockUserMutation.mutate(user.id)}
                        >
                          Unblock
                        </Button>
                      ) : (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            const reason = prompt("Reason for blocking:");
                            const notes = prompt("Additional notes (optional):");
                            if (reason) {
                              blockUserMutation.mutate({ userId: user.id, reason, notes: notes || undefined });
                            }
                          }}
                        >
                          Block
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
                            deleteUserMutation.mutate(user.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}