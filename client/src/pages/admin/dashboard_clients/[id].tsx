import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Edit2, Save, X } from "lucide-react";
import { useTranslations } from "@/lib/language-context";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

type ClientData = {
  id: number;
  email: string;
  fullName: string;
  phoneNumber: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  balance: number;
  balanceCurrency: string;
  userGroup?: string;
  transactions?: Array<{
    id: number;
    type: 'deposit' | 'withdrawal';
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: string;
  }>;
  kycUpdatedAt?: string;
  updatedAt?: string;
  kycDocuments?: Array<{ type: string; status: string }>;
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ClientData> | null>(null);

  // Fetch exchange rates for currency display - with updated configuration for live rates
  const { data: exchangeRates } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      try {
        console.log('[ClientDetail] Fetching exchange rates from API...');
        const response = await axios.get('/api/exchange-rates');
        console.log('[ClientDetail] Exchange rates received:', response.data);
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
    staleTime: 60000, // 1 minute - more frequent updates for live rates
    refetchOnWindowFocus: true // Refresh when window gets focus
  });

  // Initialize prefetch
  useEffect(() => {
    if (id) {
      console.log('Prefetching client data:', { id });
      queryClient.prefetchQuery({
        queryKey: [`/api/admin/clients/${id}`],
        queryFn: async () => {
          const response = await axios.get(`/api/admin/clients/${id}`);
          return response.data;
        }
      });
    }
  }, [id, queryClient]);

  const { data: client, isLoading, error } = useQuery({
    queryKey: [`/api/admin/clients/${id}`],
    queryFn: async () => {
      console.log('Fetching client data:', { id });
      const response = await axios.get(`/api/admin/clients/${id}`);
      return response.data as ClientData;
    },
    enabled: !!id,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ClientData>) => {
      const response = await axios.patch(`/api/admin/clients/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries([`/api/admin/clients/${id}`]);
      toast({
        title: t("success"),
        description: t("client_updated_success"),
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: t("error"),
        description: t("client_update_failed"),
        variant: "destructive",
      });
      console.error('Error updating client:', error);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("loading_client_data")}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-red-500">{t("error_loading_client")}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t("try_again")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t("client_not_found")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEdit = () => {
    setEditedData(client);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedData) return;
    updateMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  const handleChange = (field: keyof ClientData, value: string | number) => {
    if (!editedData) return;
    setEditedData({ ...editedData, [field]: value });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format currency with the proper symbol
  const formatCurrency = (amount: number, currency: string): string => {
    // Special handling for cryptocurrency currencies that aren't supported by Intl.NumberFormat
    if (currency === 'USDC' || currency === 'USDT' || currency === 'SOL' || 
        !['USD', 'EUR', 'GBP', 'CHF'].includes(currency)) {
      // Format as a number with 2 decimal places and append the currency code
      return `${amount.toFixed(2)} ${currency}`;
    }

    try {
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

  // Get equivalent in USD for display - using consistent exchange rates
  const getUsdEquivalent = (amount: number, currency: string): number => {
    if (!exchangeRates || !exchangeRates[currency]) return amount;
    if (currency === 'USD') return amount;

    // Log exchange rate used for transparency
    console.log(`[ClientDetail] Converting ${amount} ${currency} to USD using rate:`, exchangeRates[currency].USD);
    const convertedAmount = amount * exchangeRates[currency].USD;
    console.log(`[ClientDetail] Converted amount: ${convertedAmount} USD`);

    return convertedAmount;
  };

  // Get equivalent in any currency - added for consistent currency conversion
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!exchangeRates || !exchangeRates[fromCurrency]) return amount;
    if (fromCurrency === toCurrency) return amount;

    const rate = exchangeRates[fromCurrency][toCurrency];
    console.log(`[ClientDetail] Converting ${amount} ${fromCurrency} to ${toCurrency} using rate:`, rate);
    const convertedAmount = amount * rate;
    console.log(`[ClientDetail] Converted amount: ${convertedAmount} ${toCurrency}`);

    return convertedAmount;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto py-6 space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("client_details")}</h1>
        {!isEditing ? (
          <Button onClick={handleEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            {t("edit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              className="bg-green-600 hover:bg-green-700"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t("save")}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("profile_information")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                {isEditing ? (
                  <>
                    <div>
                      <Input
                        value={editedData?.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder={t("email")}
                      />
                    </div>
                    <div>
                      <Input
                        value={editedData?.fullName || ''}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        placeholder={t("full_name")}
                      />
                    </div>
                    <div>
                      <Input
                        value={editedData?.phoneNumber || ''}
                        onChange={(e) => handleChange('phoneNumber', e.target.value)}
                        placeholder={t("phone")}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("email")}</p>
                      <p>{client.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("full_name")}</p>
                      <p>{client.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("kyc_status")}</p>
                      <Badge className={getStatusColor(client.kycStatus)}>
                        {client.kycStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("balance")}</p>
                      <p>{formatCurrency(client.balance, client.balanceCurrency)}</p>
                      {client.balanceCurrency !== 'USD' && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(getUsdEquivalent(client.balance, client.balanceCurrency), 'USD')}
                        </p>
                      )}
                      {/* Add EUR equivalent if not in EUR */}
                      {client.balanceCurrency !== 'EUR' && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(convertCurrency(client.balance, client.balanceCurrency, 'EUR'), 'EUR')}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("phone")}</p>
                      <p>{client.phoneNumber || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {client.transactions && client.transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("transactions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.transactions.map((transaction) => (
                  <motion.div
                    key={transaction.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div>
                      <p className="font-medium">
                        {transaction.type === "deposit" ? t("deposit") : t("withdrawal")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                        {transaction.currency !== 'USD' && (
                          <span className="text-xs ml-1 text-muted-foreground">
                            (≈ {formatCurrency(getUsdEquivalent(transaction.amount, transaction.currency), 'USD')})
                          </span>
                        )}
                      </p>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {client.kycDocuments && client.kycDocuments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("kyc_information")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("verification_status")}</p>
                  <Badge className={getStatusColor(client.kycStatus)}>
                    {client.kycStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("last_updated")}</p>
                  <p>{new Date(client.kycUpdatedAt || client.updatedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{t("documents")}</p>
                  <div className="grid grid-cols-2 gap-4">
                    {client.kycDocuments.map((doc, index) => (
                      <motion.div
                        key={index}
                        className="p-4 border rounded-lg"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <p className="font-medium">{doc.type}</p>
                        <p className="text-sm text-muted-foreground">{doc.status}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}