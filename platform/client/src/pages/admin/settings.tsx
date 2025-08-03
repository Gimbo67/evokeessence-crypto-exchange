import { useTranslations } from "@/lib/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AdminTwoFactorManager from "@/components/admin/AdminTwoFactorManager";

export default function AdminSettings() {
  const t = useTranslations();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Placeholder for future settings implementation
      toast({
        title: t('success'),
        description: t('settings_saved_successfully'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('unknown_error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('admin_settings')}</h1>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
          <TabsTrigger value="general">{t('general')}</TabsTrigger>
          <TabsTrigger value="security">{t('security')}</TabsTrigger>
          <TabsTrigger value="user-management">{t('user_management')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('general_settings')}</CardTitle>
              <CardDescription>{t('general_settings_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t('saving') : t('save_changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('security_settings')}</CardTitle>
              <CardDescription>{t('security_settings_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Security settings content */}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('two_factor_authentication')}</CardTitle>
              <CardDescription>{t('admin_disable_user_2fa_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTwoFactorManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('user_management')}</CardTitle>
              <CardDescription>{t('user_management_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* User management settings */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}