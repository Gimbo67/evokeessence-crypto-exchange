import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast"; // Updated import path
import { CheckCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";

export function DepositTestView() {
  const { toast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch exchange rates for currency display
  const { data: exchangeRates, isLoading: isRatesLoading } = useQuery({
    queryKey: ['exchange-rates', refreshTrigger],
    queryFn: async () => {
      console.log('[TestView] Fetching exchange rates...');
      const response = await axios.get('/api/exchange-rates');
      console.log('[TestView] Exchange rates:', response.data);
      return response.data;
    },
    staleTime: 10000, // 10 seconds
  });

  // Fetch user info including balance
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', refreshTrigger],
    queryFn: async () => {
      console.log('[TestView] Fetching user data...');
      const response = await axios.get('/api/user');
      console.log('[TestView] User data:', response.data);
      return response.data.user;
    },
    staleTime: 10000, // 10 seconds
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['transactions', refreshTrigger],
    queryFn: async () => {
      console.log('[TestView] Fetching transactions...');
      const response = await axios.get('/api/transactions');
      console.log('[TestView] Transactions:', response.data);
      return response.data;
    },
    staleTime: 10000, // 10 seconds
  });

  // Fetch commission rate
  const { data: commissionData } = useQuery({
    queryKey: ['commission', refreshTrigger],
    queryFn: async () => {
      console.log('[TestView] Fetching commission rate...');
      const response = await axios.get('/api/settings/commission');
      console.log('[TestView] Commission data:', response.data);
      return response.data;
    },
    staleTime: 10000, // 10 seconds
  });

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast({
      title: "Refreshing data",
      description: "Fetching latest user data, transactions, and exchange rates...",
      duration: 2000,
    });
  };

  // Format currency for display
  const formatCurrency = (amount: number, currency: string): string => {
    if (!amount) return '0.00';

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  };

  // Convert currency using exchange rates
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!exchangeRates || !amount || fromCurrency === toCurrency) return amount;
    if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) return amount;

    return amount * exchangeRates[fromCurrency][toCurrency];
  };

  // Helpers for test display
  const getRecentDeposit = () => {
    if (!transactions || transactions.length === 0) return null;

    // Look for the most recent SEPA deposit
    return transactions.find(tx => tx.type === 'deposit');
  };

  const recentDeposit = getRecentDeposit();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Deposit Test View</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Test Information</AlertTitle>
            <AlertDescription>
              This page helps verify that the deposit flow, commission handling, and exchange rates 
              are working correctly.
            </AlertDescription>
          </Alert>

          {/* User Balance Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">User Balance</h3>
            {isUserLoading ? (
              <p>Loading user data...</p>
            ) : userData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Native Balance:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(userData.balance || '0'), userData.balanceCurrency || 'USD')}
                    </span>
                  </div>
                  {userData.balanceCurrency !== 'USD' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">USD Equivalent:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          convertCurrency(parseFloat(userData.balance || '0'), userData.balanceCurrency || 'USD', 'USD'),
                          'USD'
                        )}
                      </span>
                    </div>
                  )}
                  {userData.balanceCurrency !== 'EUR' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">EUR Equivalent:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          convertCurrency(parseFloat(userData.balance || '0'), userData.balanceCurrency || 'USD', 'EUR'),
                          'EUR'
                        )}
                      </span>
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-medium">{userData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-medium">{userData.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Default Currency:</span>
                    <span className="font-medium">{userData.balanceCurrency || 'USD'}</span>
                  </div>
                </Card>
              </div>
            ) : (
              <p>No user data available</p>
            )}
          </div>

          {/* Exchange Rates Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Exchange Rates</h3>
            {isRatesLoading ? (
              <p>Loading exchange rates...</p>
            ) : exchangeRates ? (
              <div className="grid grid-cols-1 gap-4">
                <Card className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">EUR to USD</p>
                      <p className="font-medium">{exchangeRates.EUR?.USD?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">USD to EUR</p>
                      <p className="font-medium">{exchangeRates.USD?.EUR?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                      <p className="font-medium">
                        {exchangeRates.updatedAt ? new Date(exchangeRates.updatedAt).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Commission Rate</p>
                      <p className="font-medium">{commissionData ? `${commissionData.percentage}%` : 'N/A'}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <p>No exchange rate data available</p>
            )}
          </div>

          {/* Recent Deposit Section */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Recent Deposit</h3>
            {isTransactionsLoading ? (
              <p>Loading transactions...</p>
            ) : recentDeposit ? (
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-muted-foreground">ID:</div>
                  <div>{recentDeposit.id}</div>

                  <div className="text-muted-foreground">Original Amount:</div>
                  <div>{formatCurrency(parseFloat(recentDeposit.originalAmount || recentDeposit.amount || '0'), recentDeposit.currency)}</div>

                  <div className="text-muted-foreground">Commission (16%):</div>
                  <div className="text-red-500">
                    {formatCurrency(parseFloat(recentDeposit.commissionFee || '0'), recentDeposit.currency)}
                  </div>

                  <div className="text-muted-foreground">Final Amount:</div>
                  <div className="font-semibold">
                    {formatCurrency(parseFloat(recentDeposit.amount || '0'), recentDeposit.currency)}
                  </div>

                  <div className="text-muted-foreground">Status:</div>
                  <div className={`font-medium ${
                    recentDeposit.status === 'successful' ? 'text-green-500' : 
                    recentDeposit.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {recentDeposit.status || 'unknown'}
                  </div>

                  <div className="text-muted-foreground">Created At:</div>
                  <div>{recentDeposit.createdAt ? new Date(recentDeposit.createdAt).toLocaleString() : 'N/A'}</div>

                  <div className="text-muted-foreground">Completed At:</div>
                  <div>{recentDeposit.completedAt ? new Date(recentDeposit.completedAt).toLocaleString() : 'N/A'}</div>
                </div>

                <Separator className="my-4" />

                <Alert 
                  className={recentDeposit.status === 'successful' ? 'bg-green-50' : 'bg-amber-50 dark:bg-amber-950'}
                >
                  {recentDeposit.status === 'successful' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <AlertTitle>
                    {recentDeposit.status === 'successful' ? 'Deposit Completed' : 'Deposit Pending'}
                  </AlertTitle>
                  <AlertDescription>
                    {recentDeposit.status === 'successful' 
                      ? 'This deposit has been approved by an admin and added to your balance (minus commission).' 
                      : 'This deposit is waiting for admin approval.'}
                  </AlertDescription>
                </Alert>
              </Card>
            ) : (
              <p>No recent deposits found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}