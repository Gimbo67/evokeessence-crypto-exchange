import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/hooks/use-user";
import { format } from "date-fns";
import { Download, AlertCircle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "@/lib/language-context";
import { generateTransactionPDF } from "@/utils/pdf-generator";
import { useState } from "react";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  reference?: string;
  initialAmount?: number;
  commissionAmount?: number;
  totalAmount?: number;
  txHash?: string;
  conversions?: {
    usd?: number;
    eur?: number;
    gbp?: number;
    chf?: number;
  };
};

interface HistoryTabProps {
  user: User;
}

// Fallback data when server is unreachable
const fallbackTransactions: Transaction[] = [
  {
    id: 1,
    type: "Deposit",
    amount: 1000,
    initialAmount: 1020,
    commissionAmount: 20,
    totalAmount: 1000,
    reference: "DEP-2025-03-001",
    currency: "EUR",
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 2,
    type: "USDC Purchase",
    amount: 500,
    initialAmount: 510,
    commissionAmount: 10,
    totalAmount: 500,
    reference: "USDC-2025-03-001",
    currency: "USD",
    status: "processing",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null
  },
  {
    id: 3,
    type: "Deposit",
    amount: 2000,
    initialAmount: 2040,
    commissionAmount: 40,
    totalAmount: 2000,
    reference: "DEP-2025-03-002",
    currency: "EUR",
    status: "successful",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString()
  }
];

export default function HistoryTab({ user }: HistoryTabProps) {
  const t = useTranslations();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Get exchange rates for currency conversion - updated to match other components
  const { data: exchangeRates, isLoading: isRatesLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      try {
        console.log('[HistoryTab] Fetching exchange rates from API...');
        const response = await fetch('/api/exchange-rates');
        if (!response.ok) throw new Error('Failed to fetch exchange rates');
        const data = await response.json();
        console.log('[HistoryTab] Exchange rates received:', data);
        return data;
      } catch (error) {
        console.error('[HistoryTab] Failed to fetch exchange rates:', error);
        // Return default fallback rates
        return {
          EUR: { USD: 1.08, GBP: 0.86, CHF: 0.98, EUR: 1 },
          USD: { EUR: 0.93, GBP: 0.79, CHF: 0.91, USD: 1 },
          GBP: { EUR: 1.17, USD: 1.27, CHF: 1.13, GBP: 1 },
          CHF: { EUR: 1.02, USD: 1.10, GBP: 0.88, CHF: 1 }
        };
      }
    },
    staleTime: 60000, // 1 minute - refresh more often for accurate rates
    refetchOnWindowFocus: true // Refresh when window gets focus
  });

  const { data: transactions, isLoading: isTransactionsLoading, isError } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      try {
        console.log('[HistoryTab] Fetching transactions...');
        const response = await fetch('/api/transactions', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        console.log('[HistoryTab] Transactions received:', data.length);
        return data;
      } catch (error) {
        console.error('[HistoryTab] Failed to fetch transactions:', error);
        return fallbackTransactions;
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000
  });

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return t('status_pending');
      case 'processing':
        return t('status_processing');
      case 'successful':
      case 'completed':
        return t('status_successful');
      case 'failed':
        return t('status_failed');
      default:
        return t('status_unknown', { status: status.toLowerCase() });
    }
  };

  // Format currency with proper formatting
  const formatCurrency = (amount: number, currency: string): string => {
    // Special handling for cryptocurrency currencies that aren't supported by Intl.NumberFormat
    if (currency === 'USDC' || currency === 'USDT' || currency === 'SOL' || 
        !['USD', 'EUR', 'GBP', 'CHF'].includes(currency)) {
      // Format as a number with 2 decimal places and append the currency code
      return `${amount.toFixed(2)} ${currency}`;
    }

    try {
      // Use Intl.NumberFormat for standard fiat currencies
      const formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      return formatter.format(amount);
    } catch (error) {
      console.error(`Error formatting currency ${currency}:`, error);
      // Fallback if formatter fails
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  // Convert to USD for consistent comparison (if not already in conversions)
  const convertToUsd = (amount: number, currency: string): number => {
    if (currency === 'USD') return amount;
    if (!exchangeRates || !exchangeRates[currency]) return amount;

    const rate = exchangeRates[currency].USD;
    console.log(`[HistoryTab] Converting ${amount} ${currency} to USD using rate:`, rate);
    const convertedAmount = amount * rate;
    console.log(`[HistoryTab] Converted amount: ${convertedAmount} USD`);
    return convertedAmount;
  };

  // Prepare transaction data with conversions
  const preparedTransactions = (transactions || []).map(transaction => {
    // Use API-provided conversions if available, otherwise calculate
    const conversions = transaction.conversions || {
      usd: convertToUsd(transaction.amount, transaction.currency),
      eur: exchangeRates && exchangeRates[transaction.currency] ? 
        transaction.amount * exchangeRates[transaction.currency].EUR : 
        transaction.amount,
      gbp: exchangeRates && exchangeRates[transaction.currency] ? 
        transaction.amount * exchangeRates[transaction.currency].GBP : 
        transaction.amount,
      chf: exchangeRates && exchangeRates[transaction.currency] ? 
        transaction.amount * exchangeRates[transaction.currency].CHF : 
        transaction.amount,
    };

    return {
      ...transaction,
      conversions
    };
  });

  const isLoading = isTransactionsLoading || isRatesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('transaction_history')}</CardTitle>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('transaction_history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('transaction_history_error')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadPdf = async () => {
    if (preparedTransactions.length === 0) {
      return;
    }
    
    try {
      setIsGeneratingPdf(true);
      
      // Transform user data for PDF generation using the User interface fields
      // which use camelCase naming convention
      const userData = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || '',
        email: user.email || '',
        address: user.countryOfResidence ? `${user.countryOfResidence}` : '',
        phoneNumber: user.phoneNumber || '',
        balance: user.balance,
        balanceCurrency: user.balanceCurrency
      };
      
      // Get the currently selected language from the language context
      const currentLanguage = localStorage.getItem('language') || 'en';
      
      // Generate the PDF with language parameter for proper localization
      // Using await to properly handle the async function
      await generateTransactionPDF(preparedTransactions, userData, t, currentLanguage);
      
      // Log successful PDF generation for analytics
      console.log(`Transaction history PDF generated in ${currentLanguage} language for user ID: ${user.id}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('pdf_generation_error') || 'Failed to generate PDF. Please try again later.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('transaction_history')}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPdf}
            disabled={preparedTransactions.length === 0 || isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('generating_pdf')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('download_history')}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {preparedTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('no_transactions_found')}
            </p>
          ) : (
            <div className="space-y-4">
              {/* Header Row */}
              <div className="grid grid-cols-5 gap-4 pb-2 border-b font-medium">
                <div>{t('date_tr')}</div>
                <div>{t('type_reference_tr')}</div>
                <div>{t('amount_details_tr')}</div>
                <div>{t('status_tr')}</div>
                <div>{t('details_tr')}</div>
              </div>

              {/* Transaction Rows */}
              <div className="space-y-2">
                {preparedTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="grid grid-cols-5 gap-4 py-2"
                  >
                    <div className="text-sm">
                      {format(new Date(transaction.createdAt), 'PPp')}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{transaction.type}</div>
                      {transaction.reference && (
                        <div className="text-xs text-muted-foreground">
                          {t('reference_short_tr')}: {transaction.reference}
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center">
                              <div className="font-medium">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </div>
                              <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              {(() => {
                                // For SEPA deposits, calculate the correct amounts
                                const isDeposit = transaction.type.toLowerCase().includes('deposit');
                                
                                let initialAmount, commissionAmount, totalAmount;
                                
                                if (isDeposit) {
                                  // For deposits:
                                  // 1. Initial amount is the original deposit BEFORE commission deduction
                                  // 2. Commission amount is the fee taken
                                  // 3. Total amount is the amount AFTER commission (what user receives)
                                  
                                  if (transaction.initialAmount) {
                                    // If we already have the initial amount stored, use it directly
                                    initialAmount = transaction.initialAmount;
                                  } else {
                                    // Otherwise, calculate it by adding commission back to the amount
                                    // The amount field contains what's left after commission is deducted
                                    initialAmount = transaction.amount + (transaction.commissionAmount || 0);
                                  }
                                  commissionAmount = transaction.commissionAmount || 0;
                                  totalAmount = transaction.amount; // This is the post-commission amount
                                } else {
                                  // For other transactions, use what we have or fall back
                                  initialAmount = transaction.initialAmount || transaction.amount;
                                  commissionAmount = transaction.commissionAmount || 0;
                                  totalAmount = transaction.totalAmount || transaction.amount;
                                }
                                
                                console.log(`[HistoryTab] Transaction details for ${transaction.id}:`, {
                                  initialAmount,
                                  commissionAmount,
                                  totalAmount
                                });
                                
                                return (
                                  <>
                                    <div>{t('initial_tr')}: {formatCurrency(initialAmount, transaction.currency)}</div>
                                    <div>{t('commission_tr')}: {formatCurrency(commissionAmount, transaction.currency)}</div>
                                    <div>{t('total_tr')}: {formatCurrency(totalAmount, transaction.currency)}</div>
                                  </>
                                );
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className="text-xs text-muted-foreground">
                        ≈ {formatCurrency(transaction.conversions.usd || 0, 'USD')}
                      </div>
                    </div>
                    <div className="text-sm">
                      {getStatusText(transaction.status)}
                    </div>
                    <div className="text-sm">
                      {transaction.txHash && (
                        <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px]" title={transaction.txHash}>
                          {transaction.txHash}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}