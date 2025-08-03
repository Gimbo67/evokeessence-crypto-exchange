
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "@/lib/language-context";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function UserDetail() {
  const { id } = useParams();
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEditedUser(data);
      return data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      toast({
        title: t('success'),
        description: t('user_updated_successfully'),
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('user_not_found')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    updateUser.mutate(editedUser);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('user_details')}</h1>
        <Button 
          variant={isEditing ? "default" : "outline"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? t('cancel') : t('edit')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('username')}</label>
              {isEditing ? (
                <Input 
                  value={editedUser.username || ''} 
                  onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                />
              ) : (
                <p>{user.username || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('email')}</label>
              {isEditing ? (
                <Input 
                  value={editedUser.email || ''} 
                  onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                />
              ) : (
                <p>{user.email || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('full_name')}</label>
              {isEditing ? (
                <Input 
                  value={editedUser.fullName || ''} 
                  onChange={(e) => setEditedUser({...editedUser, fullName: e.target.value})}
                />
              ) : (
                <p>{user.fullName || '-'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('user_group')}</label>
              {isEditing ? (
                <Input 
                  value={editedUser.userGroup || ''} 
                  onChange={(e) => setEditedUser({...editedUser, userGroup: e.target.value})}
                />
              ) : (
                <p>{user.userGroup || '-'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={updateUser.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('kyc_status')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={user.kycStatus === 'pending' ? 'secondary' : 'default'}>
              {user.kycStatus || t('kyc_status_pending')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
