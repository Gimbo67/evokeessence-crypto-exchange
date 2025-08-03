import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useTranslations } from '@/lib/language-context';
import { ExternalLink, Info, RefreshCw, CheckCircle, CreditCard, Coins, Zap, Shield } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

import type { User } from '@/hooks/use-user';

interface ExtendedUser extends User {
  balances?: { amount: number; currency: string; usdEquivalent?: number }[];
  balance?: number;
  balanceCurrency?: string;
}

interface TransakTabProps {
  user: ExtendedUser;
}

/**
 * TransakTab component for verified users to buy crypto directly using Transak
 */
export function TransakTab({ user }: TransakTabProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [iframeHeight, setIframeHeight] = useState('700px');
  const [iframeWidth, setIframeWidth] = useState('100%');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Adjust iframe size based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight('500px');
      } else {
        setIframeHeight('700px');
      }

      // Always use 100% width to fit the container
      setIframeWidth('100%');
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch the Transak widget URL
  const {
    data: transakData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['transakWidgetUrl'],
    queryFn: async () => {
      const response = await fetch('/api/transak/widget-url', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Transak widget URL');
      }

      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Handle manual refresh of the Transak widget URL
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: t('success'),
        description: t('refreshing_transak_url')
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('transak_url_error_description'),
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Tabs defaultValue="buy-crypto" className="w-full">
      <TabsContent value="buy-crypto" className="mt-0">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Main content card with Transak iframe */}
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('buy_crypto')}</CardTitle>
              <CardDescription>{t('buy_crypto_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col space-y-4">
                  <Skeleton className="h-[600px] w-full rounded-md" />
                  <div className="flex justify-center">
                    <p>{t('loading_transak')}</p>
                  </div>
                </div>
              ) : isError ? (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t('transak_url_error')}</AlertTitle>
                  <AlertDescription>
                    {t('transak_url_error_description')}
                  </AlertDescription>
                  <div className="mt-4">
                    <Button onClick={handleRefresh} disabled={isRefreshing}>
                      {isRefreshing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          {t('refreshing_transak_url')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('refresh_transak_url')}
                        </>
                      )}
                    </Button>
                  </div>
                </Alert>
              ) : !transakData?.url ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{t('transak_url_missing')}</AlertTitle>
                  <AlertDescription>
                    {t('transak_url_missing_description')}
                  </AlertDescription>
                  <div className="mt-4">
                    <Button onClick={handleRefresh} disabled={isRefreshing}>
                      {isRefreshing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          {t('refreshing_transak_url')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('refresh_transak_url')}
                        </>
                      )}
                    </Button>
                  </div>
                </Alert>
              ) : (
                <iframe
                  src={transakData.url}
                  title="Transak"
                  height={iframeHeight}
                  width={iframeWidth}
                  allow="camera; microphone; payment"
                  style={{ border: 'none', borderRadius: '8px' }}
                />
              )}
            </CardContent>
            <CardFooter className="flex justify-center md:justify-end">
              {!isLoading && !isError && transakData?.url && (
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {t('refreshing_transak_url')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('refresh_transak_url')}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Features and FAQ card */}
          <Card className="col-span-full lg:col-span-1">
            <CardHeader>
              <CardTitle>{t('transak_features_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{t('transak_feature_1')}</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Coins className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{t('transak_feature_2')}</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Zap className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{t('transak_feature_3')}</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">{t('transak_feature_4')}</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">{t('transak_faq_title')}</h3>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm font-medium">
                      {t('transak_faq_question_1')}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      {t('transak_faq_answer_1')}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-sm font-medium">
                      {t('transak_faq_question_2')}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      {t('transak_faq_answer_2')}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-sm font-medium">
                      {t('transak_faq_question_3')}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">
                      {t('transak_faq_answer_3')}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter>
              {!isLoading && !isError && transakData?.url && (
                <Button className="w-full" onClick={() => window.open(transakData.url, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('open_transak_widget')}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
