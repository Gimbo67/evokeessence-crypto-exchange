import { useQuery } from "@tanstack/react-query";
import { useTranslations } from '@/lib/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import axios from "axios";
import { EmployeeLayout } from "../employee-dashboard/layout";

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
    fullName: string;
    phoneNumber: string;
    address: string;
    country: string;
    balance: string;
  };
}

export default function EmployeeTransactions() {
  const t = useTranslations();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/employee/transactions"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/employee/transactions", { withCredentials: true });
        console.log("Employee transactions:", response.data);

        // Normalize transaction data
        return response.data.map((tx: any) => ({
          ...tx,
          amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount || '0'),
          initialAmount: tx.initialAmount || tx.amount || 0,
          commissionAmount: tx.commissionAmount || 0,
          totalAmount: tx.totalAmount || tx.amount || 0,
          reference: tx.reference || tx.id
        }));
      } catch (error) {
        console.error("Error fetching employee transactions:", error);
        throw error;
      }
    }
  });

  // Group transactions by user for the summary panel
  const userSummaries = transactions.reduce((acc, curr) => {
    if (!acc[curr.user.id]) {
      acc[curr.user.id] = {
        ...curr.user,
        transactionCount: 0,
        totalVolume: 0
      };
    }
    acc[curr.user.id].transactionCount++;
    acc[curr.user.id].totalVolume += curr.amount;
    return acc;
  }, {} as Record<number, any>);

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

  const panels = [
    {
      id: 'users',
      title: t('dashboard_clients'),
      defaultSize: 40,
      content: (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('balance')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(userSummaries).map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.balance}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link href={`/employee/clients/${user.id}`}>
                        {t('view_details')}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      id: 'transactions',
      title: t('transactions'),
      defaultSize: 60,
      content: (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('amount')}</TableHead>
                <TableHead>{t('reference')}</TableHead>
                <TableHead>{t('client')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('loading')}...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {t('no_transactions_found')}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                      {transaction.reference ? (
                        <span className="text-sm font-mono">{transaction.reference}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{transaction.user.username}</span>
                        <span className="text-sm text-muted-foreground">{transaction.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          transaction.status === 'successful' || transaction.status === 'completed' ? 'default' :
                          transaction.status === 'failed' || transaction.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ),
    },
  ];

  return (
    <EmployeeLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">{t('finance_dashboard')}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t('transactions')}</CardTitle>
            <CardDescription>{t('manage_transactions') || 'View and manage all transactions'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{t('dashboard_clients') || 'Clients'}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('username')}</TableHead>
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>{t('balance')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(userSummaries).map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.balance}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/employee/clients/${user.id}`}>
                              {t('view_details')}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">{t('transactions') || 'Transactions'}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('amount')}</TableHead>
                      <TableHead>{t('reference')}</TableHead>
                      <TableHead>{t('client')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {t('loading')}...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {t('no_transactions_found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
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
                            {transaction.reference ? (
                              <span className="text-sm font-mono">{transaction.reference}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{transaction.user.username}</span>
                              <span className="text-sm text-muted-foreground">{transaction.user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transaction.status === 'successful' || transaction.status === 'completed' ? 'default' :
                                transaction.status === 'failed' || transaction.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}