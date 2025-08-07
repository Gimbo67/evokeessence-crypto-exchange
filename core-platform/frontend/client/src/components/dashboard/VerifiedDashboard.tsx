import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Upload, CreditCard, History, Shield, Loader2, Home, Book, Users, HelpCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "@/lib/language-context";
import { useLanguage } from "@/lib/language-context";
import { LanguageSelector } from "@/components/language-selector";
import type { User as UserType } from "@/hooks/use-user";
import ProfileTab from "./tabs/ProfileTab";
import DepositTab from "./tabs/DepositTab";
import UsdcTab from "./tabs/UsdcTab";
import HistoryTab from "./tabs/HistoryTab";
import SecurityTab from "./tabs/SecurityTab";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Container } from "@/components/ui/container";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

// Types
interface Balance {
  amount: number;
  currency: string;
  usdEquivalent?: number;
}

interface ExtendedUser extends Omit<UserType, 'isAdmin' | 'isEmployee'> {
  isAdmin: boolean;
  isEmployee: boolean;
  balances?: Balance[];
  balance?: number;
  balanceCurrency?: string;
}

interface VerifiedDashboardProps {
  user: ExtendedUser;
}

// Helper functions
const formatCurrency = (amount: number, currency: string): string => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
};

// Main component
export function VerifiedDashboard({ user }: VerifiedDashboardProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled || false);
  const shouldReduceMotion = useReducedMotion();
  const [focusVisible, setFocusVisible] = useState(false);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Motion variants with reduced motion support
  const motionVariants = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      };

  // Online/offline handling with retry mechanism
  const handleOnline = useCallback(() => {
    setIsOffline(false);
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      setRetryCount(0);
      toast({
        title: t('connection_restored'),
        description: t('back_online'),
      });
    }, 1500);
  }, [toast, t]);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    toast({
      variant: "destructive",
      title: t('connection_lost'),
      description: t('offline_features_limited'),
    });

    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsRetrying(true);
      }, 5000);
    }
  }, [toast, retryCount, t]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Fetch exchange rates from API - use this everywhere for consistency
  const { data: exchangeRates, isLoading: isRatesLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      try {
        console.log('Fetching exchange rates from API for dashboard...');
        const response = await axios.get('/api/exchange-rates');
        console.log('Exchange rates received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        // Return default rates as fallback
        return {
          EUR: { USD: 1.08, GBP: 0.86, CHF: 0.98, EUR: 1 },
          USD: { EUR: 0.93, GBP: 0.79, CHF: 0.91, USD: 1 },
          GBP: { EUR: 1.17, USD: 1.27, CHF: 1.13, GBP: 1 },
          CHF: { EUR: 1.02, USD: 1.10, GBP: 0.88, CHF: 1 }
        };
      }
    },
    staleTime: 60000, // 1 minute - refresh more often for accurate rates
    refetchOnWindowFocus: true
  });

  // Balance calculation with API rates
  const balanceInfo = useMemo(() => {
    try {
      if (!user) return { total: 0, balances: [], error: t('user_data_unavailable') };

      const processedBalances: Balance[] = [];
      let total = 0;

      // Determine user's primary currency
      const userPrimaryCurrency = user.balanceCurrency || 'USD';

      if (Array.isArray(user.balances) && user.balances.length > 0) {
        // Handle multiple balance entries
        user.balances.forEach(balance => {
          const amount = balance.amount;
          const currency = balance.currency;

          // Calculate USD equivalent for consistent total using exchange rates from API
          let usdEquivalent = amount;
          if (currency !== 'USD' && exchangeRates && exchangeRates[currency]) {
            usdEquivalent = amount * exchangeRates[currency].USD;
          }

          processedBalances.push({ ...balance, usdEquivalent });
          total += usdEquivalent;
        });
      } else if (typeof user.balance === 'number' || typeof user.balance === 'string') {
        // Handle single balance entry
        const amount = typeof user.balance === 'string' ? parseFloat(user.balance) : user.balance;
        if (!isNaN(amount)) {
          const currency = userPrimaryCurrency;

          // Calculate USD equivalent
          let usdEquivalent = amount;
          if (currency !== 'USD' && exchangeRates && exchangeRates[currency]) {
            usdEquivalent = amount * exchangeRates[currency].USD;
            console.log(`Using exchange rate for ${currency} to USD:`, exchangeRates[currency].USD);
            console.log(`Converted ${amount} ${currency} to ${usdEquivalent} USD`);
          }

          processedBalances.push({ amount, currency, usdEquivalent });
          total = usdEquivalent;
        }
      }

      return { total, balances: processedBalances, error: null };
    } catch (error) {
      console.error('Error calculating balance:', error);
      return { total: 0, balances: [], error: t('error_calculating_balance') };
    }
  }, [user, t, exchangeRates]);

  const { total: totalBalance, balances, error: balanceError } = balanceInfo;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsLoading(true);
    // Add a slight delay to show loading state
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t('logged_out'),
        description: t('logout_success'),
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('logout_failed'),
      });
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen w-full"
      data-focus-visible={focusVisible}
    >
      {/* Main content */}
      <main
        className="flex-grow py-6 mt-16 w-full" 
        role="main"
        tabIndex={-1}
      >
        <Container className="mx-auto">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
          <div className="space-y-6">
            {/* Offline Alert */}
            <AnimatePresence>
              {isOffline && (
                <motion.div
                  {...motionVariants}
                  role="alert"
                  aria-live="assertive"
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription className="flex items-center gap-2">
                      {isRetrying ? (
                        <>
                          <span>{t('attempting_reconnect')}</span>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          <VisuallyHidden>Loading</VisuallyHidden>
                        </>
                      ) : (
                        t('currently_offline')
                      )}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold"
              tabIndex={0}
            >
              {t('welcome_dashboard')}
            </h1>

            {/* Account Balance */}
            <motion.div {...motionVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {t('account_balance')}
                    {isRetrying && (
                      <>
                        <RefreshCw
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        <VisuallyHidden>
                          {t('refreshing_data')}
                        </VisuallyHidden>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading || isRatesLoading ? (
                    <div className="flex items-center space-x-2" aria-busy="true">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>{t('loading_balance')}</span>
                    </div>
                  ) : balanceError ? (
                    <Alert variant="destructive" role="alert">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      <AlertDescription>{balanceError}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t('total_balance_usd')}</p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight" aria-label={`${t('total_balance')}: ${formatCurrency(totalBalance, 'USD')}`}>
                          {formatCurrency(totalBalance, 'USD')}
                        </p>
                      </div>
                      {balances.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <div className="w-full overflow-x-auto">
                            <div className="min-w-full">
                              <div className="grid grid-cols-3 border-b pb-2">
                                <p className="text-sm font-medium">{t('currency')}</p>
                                <p className="text-sm font-medium text-right">{t('amount')}</p>
                                <p className="text-sm font-medium text-right">{t('usd_equivalent')}</p>
                              </div>
                              <div className="space-y-2 py-2">
                                {balances.map((balance, index) => (
                                  <div key={index} className="grid grid-cols-3 items-center text-sm">
                                    <span className="font-medium">{balance.currency}</span>
                                    <span className="text-right">
                                      {formatCurrency(balance.amount, balance.currency)}
                                    </span>
                                    <span className="text-right text-muted-foreground">
                                      ≈ {formatCurrency(balance.usdEquivalent || 0, 'USD')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground pt-2 border-t">
                            {t('exchange_rates_updated')}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Dashboard Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-4"
              aria-label={t('dashboard_sections')}
            >
              <TabsList
                role="tablist"
                aria-label={t('dashboard_navigation')}
                className="flex flex-wrap w-full overflow-x-auto"
              >
                {[
                  { id: 'profile', icon: User, label: t('profile') },
                  { id: 'deposit', icon: Upload, label: t('deposit_funds') },
                  { id: 'usdc', icon: CreditCard, label: t('buy_usdc') },
                  { id: 'history', icon: History, label: t('transaction_history') },
                  { id: 'security', icon: Shield, label: t('security_settings') },
                ].map(({ id, icon: Icon, label }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`${id}-tab`}
                    className="flex-shrink-0 flex items-center justify-center"
                  >
                    <Icon className="h-4 w-4 sm:mr-2" aria-hidden="true" />
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <motion.div
                    {...motionVariants}
                    transition={{ duration: 0.2 }}
                  >
                    <Suspense fallback={<LoadingSpinner />}>
                      {/* Tab Content */}
                      {['profile', 'deposit', 'usdc', 'history', 'security'].map(id => (
                        <TabsContent
                          key={id}
                          value={id}
                          role="tabpanel"
                          id={`${id}-tab`}
                          aria-labelledby={id}
                        >
                          {id === 'profile' && <ProfileTab user={user} />}
                          {id === 'deposit' && <DepositTab user={user} />}
                          {id === 'usdc' && <UsdcTab user={user} />}
                          {id === 'history' && <HistoryTab user={user} />}
                          {id === 'security' && <SecurityTab />}
                        </TabsContent>
                      ))}
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </Tabs>

            {/* Additional Cards */}
            <div
              className="grid gap-6 md:grid-cols-2"
              role="complementary"
              aria-label={t('account_status')}
            >
              {/* KYC Status */}
              <motion.div
                {...motionVariants}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{t('verification_status')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-800" role="status">
                        {t('verified')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 2FA Security */}
              <motion.div
                {...motionVariants}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" aria-hidden="true" />
                      {t('two_factor_authentication')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled ? t('2fa_enabled_message') : t('2fa_disabled_message')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
        </Container>
      </main>
    </div>
  );
}

// Enhanced LoadingSpinner component
const LoadingSpinner: React.FC = () => {
  const t = useTranslations();
  return (
    <div
      className="flex items-center justify-center p-8"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      <VisuallyHidden>{t('loading')}</VisuallyHidden>
    </div>
  );
};

// Enhanced ErrorFallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => {
  const t = useTranslations();
  return (
    <Alert
      variant="destructive"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex flex-col gap-2">
        <p>{t('error_loading_dashboard')}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
          aria-label={t('try_again')}
        >
          {t('try_again')}
        </Button>
      </AlertDescription>
    </Alert>
  );
};