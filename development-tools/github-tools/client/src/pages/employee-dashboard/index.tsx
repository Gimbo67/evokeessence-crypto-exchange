import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, CreditCard, DollarSign, AlertCircle, 
  ChevronUpIcon, ChevronDownIcon, Activity 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeLayout } from './layout';

// Types
interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingKyc: number;
  totalTransactions: number;
  pendingTransactions: number;
  recentDeposits: number;
  dailyAmount: string | number;
  permissions: Record<string, boolean>;
  recentActivity?: {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    amount?: number;
    currency?: string;
    status: string;
  }[];
  chartData?: {
    name: string;
    transactions: number;
    amount: number;
  }[];
}

// Placeholder for empty state
const EmptyDashboardStats: DashboardStats = {
  totalClients: 0,
  activeClients: 0,
  pendingKyc: 0,
  totalTransactions: 0,
  pendingTransactions: 0,
  recentDeposits: 0,
  dailyAmount: "0",
  permissions: {},
  recentActivity: [],
  chartData: [],
};

export default function EmployeeDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStats>(EmptyDashboardStats);
  const [permissions, setPermissions] = useState<string[]>([]);

  // Check if employee has specific permission
  const hasPermission = (permission: string) => {
    // Check first from the permissions array
    if (permissions.includes(permission)) {
      return true;
    }
    
    // Also check from the stats.permissions object (from API)
    if (stats.permissions && stats.permissions[permission]) {
      return true;
    }
    
    return false;
  };

  // Fetch dashboard data with improved error handling
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Use Promise.allSettled to fetch both data sources in parallel and handle errors
        const [permissionsResult, statsResult] = await Promise.allSettled([
          axios.get('/bypass/employee/dashboard/permissions'),
          axios.get('/bypass/employee/dashboard/stats')
        ]);
        
        // Handle permissions data
        if (permissionsResult.status === 'fulfilled' && permissionsResult.value.data.permissions) {
          // Extract permissions from response
          const permData = permissionsResult.value.data.permissions;
          // Check if permissions is an object or array and handle accordingly
          if (typeof permData === 'object' && !Array.isArray(permData)) {
            // Convert object to array of permission names
            setPermissions(Object.keys(permData).filter(key => permData[key] === true));
          } else if (Array.isArray(permData)) {
            setPermissions(permData);
          }
        } else {
          console.warn('Could not load permissions data:', 
            permissionsResult.status === 'rejected' ? permissionsResult.reason : 'Invalid data format');
        }
        
        // Handle stats data
        if (statsResult.status === 'fulfilled' && statsResult.value.data) {
          console.log('Stats response:', statsResult.value.data);
          
          // Extract stats from response, handle different response formats
          const statsData = statsResult.value.data.stats || statsResult.value.data;
          
          if (statsData) {
            // Make sure all required properties have defaults
            const processedStats = {
              ...EmptyDashboardStats, // Start with defaults for all fields
              ...statsData, // Override with actual data
              // Ensure these specific fields have defaults if missing
              chartData: statsData.chartData || [],
              recentActivity: statsData.recentActivity || [],
              permissions: statsData.permissions || {}
            };
            setStats(processedStats);
          } else {
            console.warn('Stats data is empty or in unexpected format');
            toast({
              title: 'Warning',
              description: 'Could not load complete dashboard data',
              variant: 'default',
            });
          }
        } else {
          console.error('Failed to load stats data:', 
            statsResult.status === 'rejected' ? statsResult.reason : 'Invalid data format');
          toast({
            title: 'Error',
            description: 'Failed to load dashboard data',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error in dashboard data fetch:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // Format currency
  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) {
      return '$0.00';
    }
    
    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle NaN values
    if (isNaN(numericAmount as number)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numericAmount as number);
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        
        {/* Permission-based welcome message */}
        <p className="text-muted-foreground">
          Welcome to your dashboard. You currently have access to:
          <span className="font-medium"> 
            {stats.permissions ? 
              Object.keys(stats.permissions)
                .filter(key => stats.permissions[key] === true)
                .map(key => key.replace(/_/g, ' '))
                .join(', ') : 
              permissions.join(', ')
            }
          </span>
        </p>

        {/* Stats overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Clients card - only visible if employee has permission */}
          {hasPermission('view_clients') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalClients}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeClients} active clients
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Pending KYC card - only visible if employee has permission */}
          {hasPermission('change_kyc_status') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.pendingKyc}</div>
                    <p className="text-xs text-muted-foreground">
                      Verification requests
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Transaction count card - only visible if employee has permission */}
          {hasPermission('view_transactions') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                    <p className="text-xs text-muted-foreground">
                      In the last 30 days
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Transaction amount card - only visible if employee has permission */}
          {hasPermission('view_transactions') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {typeof stats.dailyAmount === 'string' 
                        ? formatCurrency(parseFloat(stats.dailyAmount)) 
                        : formatCurrency(stats.dailyAmount as number)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Transaction volume (30 days)
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Transaction chart - only visible if employee has analytics permission */}
        {hasPermission('view_analytics') && (
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Transaction Overview</CardTitle>
              <CardDescription>Transaction trends over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <div className="h-[300px]">
                  {stats.chartData && stats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Bar yAxisId="left" dataKey="transactions" fill="#8884d8" name="Transactions" />
                        <Bar yAxisId="right" dataKey="amount" fill="#82ca9d" name="Amount ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No chart data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent activity - visible to all employees */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and client activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 border-b pb-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                          {activity.amount && (
                            <p className="text-sm font-medium">
                              {formatCurrency(activity.amount)} {activity.currency}
                            </p>
                          )}
                          <span className={`text-xs rounded-full px-2 py-0.5 ${
                            activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                            activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No recent activity found
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}