import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useTranslations } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Filter, ExternalLink, Trash2, Info, Edit2, Save } from "lucide-react";
import { Link } from "wouter";
import React, { useState, useEffect } from "react";
import AdminLayout from "./layout";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  txHash?: string;
  initialAmount?: number;
  commissionAmount?: number;
  totalAmount?: number;
  reference?: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

// Form schema for transaction hash update
const txHashFormSchema = z.object({
  txHash: z.string().min(10, "Transaction hash should be at least 10 characters long"),
});

export default function TransactionsPage() {
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [txHashDialogOpen, setTxHashDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: async () => {
      try {
        console.log("Fetching admin transactions...");
        const response = await axios.get("/api/admin/transactions", { withCredentials: true });
        console.log("Raw transaction response:", response);

        // Check if the response data is an object with a transactions property
        const transactionsData = Array.isArray(response.data) ? response.data : 
                                response.data.transactions || response.data;

        if (!Array.isArray(transactionsData)) {
          console.error("Invalid transactions data format:", transactionsData);
          throw new Error("Invalid transactions data format: expected array");
        }

        console.log(`Processing ${transactionsData.length} transactions`);

        // Log transaction types for debugging
        const typeCount = transactionsData.reduce((acc, tx) => {
          acc[tx.type] = (acc[tx.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log("Transaction types count:", typeCount);

        // Log USDC transactions specifically
        const usdcTransactions = transactionsData.filter(tx => tx.type === 'usdc');
        console.log(`Found ${usdcTransactions.length} USDC transactions:`, usdcTransactions);

        // Ensure transactions have a consistent format, even when the API structure varies
        return transactionsData.map((tx: any) => ({
          ...tx,
          id: tx.id || `unknown-${Math.random()}`,
          type: tx.type || 'unknown',
          amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0'),
          currency: tx.currency || 'EUR',
          status: tx.status || 'unknown',
          createdAt: tx.createdAt || new Date().toISOString(),
          initialAmount: tx.initialAmount || tx.amount || 0,
          commissionAmount: tx.commissionAmount || 0,
          totalAmount: tx.totalAmount || tx.amount || 0,
          reference: tx.reference || tx.id,
          user: tx.user || {
            id: tx.userId || 0,
            username: tx.username || 'Unknown',
            email: tx.email || 'unknown@example.com'
          }
        }));
      } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
    },
    staleTime: 30000, // Consider data fresh for 30 seconds 
    retry: 2, // Retry failed queries up to 2 times
  });

  // Status update mutation
  const updateTransactionStatus = useMutation({
    mutationFn: async ({ id, type, status }: { id: string, type: string, status: string }) => {
      let endpoint = '';
      // Extract numeric ID after prefix (e.g., from "sepa-123" get "123")
      const [prefix, numericId] = id.split('-');

      if (!numericId) {
        throw new Error('Invalid transaction ID format');
      }

      // Use lowercase type comparison for consistency
      switch (type.toLowerCase()) {
        case 'deposit':
          endpoint = `/api/admin/deposits/${numericId}`;
          break;
        case 'usdt':
          endpoint = `/api/admin/usdt/${numericId}`;
          break;
        case 'usdc':
          endpoint = `/api/admin/usdc/${numericId}`;
          break;
        default:
          throw new Error(`Invalid transaction type: ${type}`);
      }

      console.log('Updating transaction status:', {
        id,
        numericId,
        type,
        status,
        endpoint
      });

      const response = await axios.patch(endpoint, { status }, { withCredentials: true });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({
        title: t('success'),
        description: t('transaction_status_updated')
      });
    },
    onError: (error) => {
      console.error('Error updating transaction status:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failed_to_update_transaction_status')
      });
    }
  });

  // Transaction hash update mutation
  const updateTransactionHash = useMutation({
    mutationFn: async ({ id, type, txHash }: { id: string, type: string, txHash: string }) => {
      try {
        // Extract numeric ID after prefix (e.g., from "usdc-123" get "123")
        const [prefix, numericId] = id.split('-');

        if (!numericId) {
          throw new Error('Invalid transaction ID format');
        }

        // Only allow hash updates for USDC transactions
        if (type.toLowerCase() !== 'usdc') {
          throw new Error('Transaction hash updates are only supported for USDC transactions');
        }

        const endpoint = `/api/admin/usdc/${numericId}`;
        console.log('Updating transaction hash:', {
          id,
          numericId,
          type,
          txHash: txHash ? '[HASH PROVIDED]' : 'none',
          endpoint
        });

        const response = await axios.patch(
          endpoint, 
          { txHash, status: 'successful' }, // Setting status to successful since hash is provided
          { withCredentials: true }
        );

        return response.data;
      } catch (error) {
        console.error('Error updating transaction hash:', error);
        if (axios.isAxiosError(error)) {
          console.error('Status:', error.response?.status);
          console.error('Response data:', error.response?.data);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({
        title: "Success",
        description: "Transaction hash updated successfully"
      });
      setTxHashDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error updating transaction hash:', error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Failed to update transaction hash"
      });
    }
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: string }) => {
      try {
        // Extract the transaction type and numeric ID
        const [prefix, numericId] = id.split('-');

        if (!numericId) {
          throw new Error('Invalid transaction ID format');
        }

        // Determine the actual type for the API endpoint
        let apiType = type.toLowerCase();
        if (apiType === 'deposit') {
          apiType = 'sepa';
        }
        // Make sure 'usdc' type is handled properly
        console.log('Deleting transaction:', {
          id,
          type,
          apiType,
          numericId,
          endpoint: `/api/admin/transactions/${apiType}/${numericId}`
        });

        const response = await axios.delete(
          `/api/admin/transactions/${apiType}/${numericId}`, 
          { withCredentials: true }
        );

        console.log('Delete transaction response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error in deleteTransaction mutation:', error);
        if (axios.isAxiosError(error)) {
          console.error('Status:', error.response?.status);
          console.error('Response data:', error.response?.data);
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({
        title: t('success'),
        description: t('transaction_deleted_successfully')
      });
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failed_to_delete_transaction')
      });
    }
  });

  const handleStatusUpdate = async (transaction: Transaction, newStatus: string) => {
    try {
      await updateTransactionStatus.mutateAsync({
        id: transaction.id,
        type: transaction.type,
        status: newStatus
      });
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    try {
      await deleteTransaction.mutateAsync({
        id: transaction.id,
        type: transaction.type
      });
    } catch (error) {
      console.error('Error in handleDeleteTransaction:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'successful':
        return 'bg-green-500/20 text-green-700 hover:bg-green-500/30';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30';
      case 'failed':
      case 'rejected':
        return 'bg-red-500/20 text-red-700 hover:bg-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-700 hover:bg-blue-500/30';
    }
  };

  const formatAmount = (amount: number, currency: string): string => {
    if (currency === 'USDC' || currency === 'USDT') {
      return `${amount.toFixed(2)} ${currency}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.reference && tx.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.txHash && tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" ? true : tx.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === "all" ? true : tx.type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  // Form for transaction hash edit
  const txHashForm = useForm<z.infer<typeof txHashFormSchema>>({
    resolver: zodResolver(txHashFormSchema),
    defaultValues: {
      txHash: selectedTransaction?.txHash || ""
    }
  });

  // Update form values when selected transaction changes
  useEffect(() => {
    if (selectedTransaction) {
      txHashForm.reset({
        txHash: selectedTransaction.txHash || ""
      });
    }
  }, [selectedTransaction, txHashForm]);

  // Handle transaction hash update
  const handleTxHashUpdate = async (values: z.infer<typeof txHashFormSchema>) => {
    if (!selectedTransaction) return;
    
    try {
      await updateTransactionHash.mutateAsync({
        id: selectedTransaction.id,
        type: selectedTransaction.type,
        txHash: values.txHash
      });
    } catch (error) {
      console.error('Error in handleTxHashUpdate:', error);
    }
  };

  const panels = [{
    id: 'transactions',
    title: t('transactions'),
    defaultSize: 100,
    content: (
      <div className="container py-6">
        <Card className="mb-6 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search_transactions')}
                  className="pl-8 bg-background/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-background/50">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      {statusFilter === "all" ? t('filter_status') : t(statusFilter.toLowerCase())}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_statuses')}</SelectItem>
                    <SelectItem value="pending">{t('pending')}</SelectItem>
                    <SelectItem value="processing">{t('processing')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                    <SelectItem value="successful">{t('successful')}</SelectItem>
                    <SelectItem value="failed">{t('failed')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px] bg-background/50">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      {typeFilter === "all" ? t('filter_type') : t(`transaction_type_${typeFilter}`)}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_types')}</SelectItem>
                    <SelectItem value="deposit">{t('sepa_deposit')}</SelectItem>
                    <SelectItem value="usdt">USDT</SelectItem>
                    <SelectItem value="usdc">USDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/50">
                    <TableHead className="py-3">{t('date')}</TableHead>
                    <TableHead>{t('client')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('reference')}</TableHead>
                    <TableHead>{t('amount')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        {t('loading')}...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-red-500">
                        {t('error_loading_transactions')}
                        {/* Additional debugging info */}
                        <div className="text-xs mt-2">
                          {error instanceof Error ? error.message : 'Unknown error'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        {t('no_transactions_found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className="border-b border-border/40 hover:bg-muted/50"
                      >
                        <TableCell className="py-3">
                          {formatDate(new Date(transaction.createdAt))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link href={`/admin/clients/${transaction.user.id}`} className="font-medium text-primary hover:underline">
                              {transaction.user.username}
                            </Link>
                            <span className="text-xs text-muted-foreground">{transaction.user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{t(`transaction_type_${transaction.type}`)}</TableCell>
                        <TableCell>
                          {transaction.reference ? (
                            <span className="text-sm font-mono">{transaction.reference}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center">
                                  {formatAmount(transaction.amount, transaction.currency)}
                                  <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1 text-xs">
                                  <div>Initial: {formatAmount(transaction.initialAmount || transaction.amount, transaction.currency)}</div>
                                  <div>Commission: {formatAmount(transaction.commissionAmount || 0, transaction.currency)}</div>
                                  <div>Total: {formatAmount(transaction.totalAmount || transaction.amount, transaction.currency)}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {/* Status Update Select */}
                            <Select
                              value={transaction.status}
                              onValueChange={(newStatus) => handleStatusUpdate(transaction, newStatus)}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder={t('update_status')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">{t('pending')}</SelectItem>
                                <SelectItem value="processing">{t('processing')}</SelectItem>
                                <SelectItem value="successful">{t('successful')}</SelectItem>
                                <SelectItem value="completed">{t('completed')}</SelectItem>
                                <SelectItem value="failed">{t('failed')}</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Transaction Hash Edit Button for USDC */}
                            {transaction.type.toLowerCase() === 'usdc' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="flex items-center"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setTxHashDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                {transaction.txHash ? 'Edit TX' : 'Add TX'}
                              </Button>
                            )}

                            {/* Transaction Blockchain Link */}
                            {transaction.txHash && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={`https://solscan.io/tx/${transaction.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  TX
                                </a>
                              </Button>
                            )}

                            {/* Delete Transaction Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-100/30">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {/* Cast to any to avoid TypeScript error until type definitions are updated */}
                                    {(t as any)('confirm_delete_transaction_description', { 
                                      type: t(`transaction_type_${transaction.type}`),
                                      amount: formatAmount(transaction.amount, transaction.currency)
                                    })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteTransaction(transaction)}
                                    className="bg-red-500 hover:bg-red-600">
                                    {t('delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  }];

  return (
    <>
      <AdminLayout panels={panels} />
      
      {/* Transaction Hash Edit Dialog */}
      <Dialog open={txHashDialogOpen} onOpenChange={setTxHashDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTransaction?.txHash ? 'Edit Transaction Hash' : 'Add Transaction Hash'}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.txHash 
                ? 'Update the transaction hash for this USDC transaction.' 
                : 'Add a blockchain transaction hash to mark this USDC transaction as complete.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...txHashForm}>
            <form onSubmit={txHashForm.handleSubmit(handleTxHashUpdate)} className="space-y-4">
              <FormField
                control={txHashForm.control}
                name="txHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Hash</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter transaction hash" 
                        {...field} 
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the Solana transaction hash for this USDC transaction.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setTxHashDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTransactionHash.isPending || !txHashForm.formState.isValid}
                  className="ml-2"
                >
                  {updateTransactionHash.isPending ? (
                    <span className="flex items-center">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}