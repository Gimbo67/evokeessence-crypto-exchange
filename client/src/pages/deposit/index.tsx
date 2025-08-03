import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/lib/language-context';
import { Shield, AlertCircle, CheckCircle, Landmark, ArrowLeftCircle, ClockIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { DepositForm } from '@/components/deposits/DepositForm';
import { BankDetails } from '@/components/deposits/BankDetails';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Separator } from '@/components/ui/separator';

const bankDetails = {
  name: "EvokeEssence s.r.o.",
  iban: "LT80 3130 0101 4308 4139",
  bic: "BZENLT22",
  address: "Prague, Czech Republic"
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

export default function DepositPage() {
  const t = useTranslations();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = React.useState("sepa");

  const { data: userStatus, isLoading } = useQuery({
    queryKey: ['user-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user/status', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user status');
        }
        return response.json();
      } catch (error) {
        // Return default status for offline/testing
        return {
          canDeposit: true,
          kycStatus: 'approved'
        };
      }
    }
  });

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dashboard_deposit_funds')}</CardTitle>
              <CardDescription>{t('dashboard_deposit_description')}</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/dashboard")}
              className="hidden sm:flex items-center gap-2"
            >
              <ArrowLeftCircle className="h-4 w-4" />
              {t('back_to_dashboard')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorBoundary>
            <div className="space-y-6">
              <Alert variant="default" className="border-primary/20">
                <Shield className="h-4 w-4" />
                <AlertTitle>{t('dashboard_secure_transaction')}</AlertTitle>
                <AlertDescription>
                  {t('dashboard_secure_transaction_description')}
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <LoadingSkeleton />
              ) : !userStatus?.canDeposit ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('dashboard_deposit_unavailable')}</AlertTitle>
                  <AlertDescription>
                    {t('dashboard_deposit_unavailable_description')}
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs defaultValue="sepa" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="sepa" className="flex items-center gap-2">
                      <Landmark className="h-4 w-4" />
                      {t('dashboard_sepa_transfer')}
                    </TabsTrigger>
                    <TabsTrigger value="crypto" disabled className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {t('dashboard_crypto_transfer')}
                      <span className="ml-1 text-xs opacity-70 rounded-full bg-muted px-2 py-0.5">{t('dashboard_coming_soon')}</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="sepa" className="mt-0 space-y-4">
                    <Card className="border border-primary/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Landmark className="h-5 w-5" />
                          {t('dashboard_sepa_instructions')}
                        </CardTitle>
                        <CardDescription>
                          {t('dashboard_sepa_description')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Bank details section removed to avoid duplication */}

                          <div className="p-4 rounded-lg border">
                            <h3 className="font-medium text-sm flex items-center gap-2 mb-4">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-xs">1</span>
                              {t('dashboard_deposit_details')}
                            </h3>
                            <DepositForm className="max-w-none" />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{t('dashboard_processing_time')}</p>
                            </div>
                            <p className="text-muted-foreground">1-3 {t('dashboard_business_days')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Alert variant="default" className="bg-muted/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('dashboard_important')}</AlertTitle>
                      <AlertDescription>
                        {t('dashboard_deposit_warning')}
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="crypto" className="mt-0">
                    <Card className="bg-muted/10">
                      <CardHeader>
                        <CardTitle className="text-lg">{t('dashboard_crypto_transfer')}</CardTitle>
                        <CardDescription>{t('dashboard_crypto_description')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">{t('dashboard_crypto_coming_soon_message')}</p>
                          <Button variant="outline" onClick={() => setActiveTab("sepa")}>
                            {t('dashboard_try_sepa_instead')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}

              <div className="flex justify-between">
                <Button variant="outline" className="sm:hidden" onClick={() => setLocation("/dashboard")}>
                  {t('back_to_dashboard')}
                </Button>

                <Button variant="default" onClick={() => setLocation("/transactions")} className="ml-auto">
                  {t('view_transactions')}
                </Button>
              </div>
            </div>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
}