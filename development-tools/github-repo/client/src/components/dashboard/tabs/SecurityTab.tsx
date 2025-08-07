import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, KeyRound, Smartphone, RefreshCw, Lock } from "lucide-react";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetupFixed";
import { DisableTwoFactor } from "@/components/auth/DisableTwoFactor";
import { useTranslations } from "@/lib/language-context";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SecurityTab() {
  const [activeTab, setActiveTab] = useState<'overview' | 'twoFactor' | 'backup'>('overview');
  const { toast } = useToast();
  const t = useTranslations();
  const queryClient = useQueryClient();

  // Fetch 2FA status using bypass route with aggressive cache control
  const { data: twoFactorStatus, isLoading: isLoadingStatus, refetch: refetch2FAStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      console.log('Fetching 2FA status using bypass route...');
      try {
        // Add timestamp to prevent browser caching
        const timestamp = new Date().getTime();
        const url = `/bypass/2fa/status?_=${timestamp}`;
        
        // Use bypass API to avoid Vite middleware issues
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });
        
        console.log('2FA status response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to fetch 2FA status');
        }
        
        // Parse JSON
        const data = await response.json();
        console.log('2FA status response data:', data);
        
        return data;
      } catch (error) {
        console.error('Error fetching 2FA status:', error);
        throw error;
      }
    },
    staleTime: 10 * 1000, // Only consider fresh for 10 seconds
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when tab gets focus
    refetchOnMount: true, // Always fetch on component mount
    refetchOnReconnect: true, // Refresh when network reconnects
  });

  // Regenerate backup codes mutation using bypass route
  const regenerateCodesMutation = useMutation({
    mutationFn: async () => {
      console.log('Regenerating backup codes using bypass route...');
      try {
        const response = await fetch('/bypass/2fa/backup-codes/regenerate', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include',
        });
        
        console.log('Regenerate backup codes response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to regenerate backup codes');
        }
        
        const data = await response.json();
        console.log('Regenerate backup codes response data:', data);
        
        return data;
      } catch (error) {
        console.error('Error regenerating backup codes:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: t('backup_codes_regenerated'),
        description: t('new_backup_codes_generated')
      });
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('error'),
        description: error.message
      });
    }
  });

  // Handle tab navigation and completion with status refresh
  const handleTwoFactorComplete = async () => {
    console.log('2FA setup/disable complete, refreshing status...');
    
    // Invalidate all related queries
    await queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    await queryClient.invalidateQueries({ queryKey: ['user'] });
    
    // Explicitly trigger a status refresh
    try {
      await refetch2FAStatus();
      console.log('2FA status refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh 2FA status:', error);
    }
    
    // Navigate back to overview tab
    setActiveTab('overview');
  };

  // Handle backup codes generation
  const handleRegenerateBackupCodes = () => {
    regenerateCodesMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('security_settings')}</h2>
          <p className="text-muted-foreground">
            {t('manage_security_settings')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="twoFactor">{t('two_factor_setting')}</TabsTrigger>
          <TabsTrigger 
            value="backup" 
            disabled={!twoFactorStatus?.enabled}
          >
            {t('backup_codes')}
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('security_status')}</CardTitle>
              <CardDescription>
                {t('security_status_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingStatus ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    {/* Security Level Status */}
                    <div className="p-4 border rounded-md bg-muted/30">
                      <h3 className="font-medium mb-2">{t('twofa_security_level')}</h3>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm">
                          {twoFactorStatus?.enabled ? (
                            <span className="font-medium text-green-700">{t('twofa_security_level_enhanced')}</span>
                          ) : (
                            <span className="font-medium text-amber-700">{t('twofa_security_level_basic')}</span>
                          )}
                        </div>
                        <div>
                          {twoFactorStatus?.enabled ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                              {t('enabled')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              {t('disabled')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${twoFactorStatus?.enabled ? 'bg-green-600 w-full' : 'bg-amber-500 w-1/3'}`}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <span>{t('two_factor_setting')}</span>
                      </div>
                      <div>
                        {twoFactorStatus?.enabled ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                            {t('enabled')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {t('disabled')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <span>{t('backup_codes')}</span>
                      </div>
                      <div>
                        {twoFactorStatus?.enabled ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            {twoFactorStatus?.backupCodesCount || 0} {t('available')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 hover:bg-gray-100">
                            {t('unavailable')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {!twoFactorStatus?.enabled ? (
                    <Alert variant="default" className="bg-amber-50 border-amber-100 text-amber-800">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800 font-medium">{t('enhance_security_cs')}</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        {t('twofa_warning_message_cs')}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="default" className="bg-green-50 border-green-100 text-green-800">
                      <Shield className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800 font-medium">{t('security_enabled')}</AlertTitle>
                      <AlertDescription className="text-green-700">
                        {t('twofa_enabled_message_alt')}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => setActiveTab('twoFactor')}
                className="w-full"
              >
                {twoFactorStatus?.enabled ? t('manage_2fa') : t('setup_2fa')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Two-Factor Authentication Tab */}
        <TabsContent value="twoFactor">
          {isLoadingStatus ? (
            <Card>
              <CardContent className="flex justify-center items-center py-8">
                <LoadingSpinner />
              </CardContent>
            </Card>
          ) : twoFactorStatus?.enabled ? (
            <DisableTwoFactor onComplete={handleTwoFactorComplete} />
          ) : (
            <TwoFactorSetup onComplete={handleTwoFactorComplete} />
          )}
        </TabsContent>
        
        {/* Backup Codes Tab */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {t('backup_codes')}
              </CardTitle>
              <CardDescription>
                {t('backup_codes_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingStatus ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>{t('backup_codes_info')}</AlertTitle>
                    <AlertDescription>
                      {t('backup_codes_usage_info')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-4 border rounded-md bg-muted">
                    <p className="text-sm font-medium mb-2">{t('available_backup_codes')}</p>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-lg">
                        {twoFactorStatus?.backupCodesCount || 0}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {twoFactorStatus?.backupCodesCount === 0 ? (
                          t('no_backup_codes')
                        ) : twoFactorStatus?.backupCodesCount === 1 ? (
                          t('one_backup_code')
                        ) : (
                          t('multiple_backup_codes', { count: twoFactorStatus?.backupCodesCount })
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {t('regenerate_backup_codes_info')}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleRegenerateBackupCodes}
                className="w-full"
                disabled={regenerateCodesMutation.isPending}
              >
                {regenerateCodesMutation.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    {t('regenerating')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('regenerate_backup_codes')}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}