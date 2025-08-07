import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";
import { Shield, Clock, User, FileText } from "lucide-react";

interface BlockedUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_blocked: boolean;
  blocked_by: number;
  blocked_at: string;
  block_reason: string;
  block_notes?: string;
  blockedByAdmin?: {
    id: number;
    username: string;
    full_name?: string;
  };
  transactionCount: number;
  kyc_status?: string;
}

export default function BlockedUsersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const [editingNotes, setEditingNotes] = useState<{[key: number]: string}>({});
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);

  const { data: blockedUsers = [], isLoading } = useQuery<BlockedUser[]>({
    queryKey: ["admin-blocked-users"],
    queryFn: async () => {
      const res = await fetch('/api/admin/blocked-users', {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch blocked users');
      }
      return res.json();
    },
    enabled: !!user?.isAdmin
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
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: "User unblocked successfully",
      });
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ userId, notes }: { userId: number; notes: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/block-notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-users"] });
      setEditingNotesId(null);
      setEditingNotes({});
      toast({
        title: "Success",
        description: "Notes updated successfully",
      });
    }
  });

  const handleUpdateNotes = (userId: number) => {
    const notes = editingNotes[userId] || '';
    updateNotesMutation.mutate({ userId, notes });
  };

  const startEditingNotes = (userId: number, currentNotes: string) => {
    setEditingNotesId(userId);
    setEditingNotes({ [userId]: currentNotes || '' });
  };

  const cancelEditingNotes = () => {
    setEditingNotesId(null);
    setEditingNotes({});
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container py-6 mt-20">Loading...</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container py-6 mt-20">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold">Blocked Users</h1>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{blockedUsers.length} blocked users</span>
        </div>
      </div>

      {blockedUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Blocked Users</h3>
            <p className="text-muted-foreground">All users are currently active.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Blocked Users Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Info</TableHead>
                  <TableHead>Block Details</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Account Info</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.full_name && (
                          <div className="text-sm text-muted-foreground">{user.full_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {new Date(user.blocked_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm">
                          <strong>Reason:</strong> {user.block_reason}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          By: {user.blockedByAdmin?.username || 'Unknown'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingNotesId === user.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingNotes[user.id] || ''}
                            onChange={(e) => setEditingNotes({ 
                              ...editingNotes, 
                              [user.id]: e.target.value 
                            })}
                            placeholder="Add notes about this user..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateNotes(user.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingNotes}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {user.block_notes ? (
                            <div className="text-sm bg-muted p-2 rounded">
                              {user.block_notes}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              No notes
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditingNotes(user.id, user.block_notes || '')}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Edit Notes
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>KYC: {user.kyc_status || 'Pending'}</div>
                        <div>Transactions: {user.transactionCount}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to unblock this user?")) {
                            unblockUserMutation.mutate(user.id);
                          }
                        }}
                        disabled={unblockUserMutation.isPending}
                      >
                        Unblock User
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}