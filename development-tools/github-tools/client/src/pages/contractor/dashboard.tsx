import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";
import { useLocation } from "wouter";
// Removed DashboardLayout import as it's causing issues
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercentage } from "@/lib/currency-utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { User } from "@/hooks/use-user";
import { 
  ChevronRightIcon, 
  CopyIcon, 
  DollarSignIcon, 
  UsersIcon, 
  PieChartIcon,
  TrendingUpIcon,
  LogOut
} from "lucide-react";

// Interface for referred client deposits
interface ReferredDeposit {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  status: string;
  commission: number;
  createdAt: string;
  completedAt?: string;
  clientUsername?: string;
}

// Interface for commission summary
interface CommissionSummary {
  totalCommissionEarned: number;
  totalReferredDeposits: number;
  activeReferrals: number;
  pendingCommissions: number;
}

const ContractorDashboard = () => {
  const { user } = useUser();
  const { logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/auth');
      toast({
        title: t("success"),
        description: t("logout_success"),
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("logout_failed"),
      });
    }
  };

  // Fetch contractor analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ["contractor-analytics"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/contractor/analytics", {
          withCredentials: true,
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching contractor analytics:", error);
        throw error;
      }
    },
    staleTime: 60000 // 1 minute
  });
  
  // Extract data from analytics
  const referredDeposits = analyticsData?.referredDeposits || [];
  const commissionSummary = analyticsData ? {
    totalCommissionEarned: analyticsData.totalCommission || 0,
    totalReferredDeposits: analyticsData.totalReferredDeposits || 0,
    activeReferrals: analyticsData.referredClientsCount || 0,
    pendingCommissions: referredDeposits
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0)
  } : {
    totalCommissionEarned: 0,
    totalReferredDeposits: 0,
    activeReferrals: 0,
    pendingCommissions: 0
  };

  // Generate monthly data for charts based on deposits
  const getMonthlyData = () => {
    const months: Record<string, { month: string, commissions: number, deposits: number }> = {};
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const monthYear = `${monthName} ${date.getFullYear()}`;
      months[monthYear] = { month: monthYear, commissions: 0, deposits: 0 };
    }

    // Populate with actual data
    referredDeposits.forEach(deposit => {
      const date = new Date(deposit.createdAt);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const monthYear = `${monthName} ${date.getFullYear()}`;
      
      if (months[monthYear]) {
        months[monthYear].deposits += deposit.amount;
        months[monthYear].commissions += deposit.commission;
      }
    });

    return Object.values(months);
  };

  const monthlyData = getMonthlyData();

  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: t("success"),
        description: t("referral_code_copied"),
      });
    }
  };

  // Handle refresh data
  const refreshData = () => {
    refetchAnalytics();
    toast({
      title: t("refreshed"),
      description: t("data_updated"),
    });
  };

  // Display loading state
  if (analyticsLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
          <p className="mt-4 text-muted-foreground">{t("loading_data") || "Loading data..."}</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (analyticsError) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-destructive text-lg">{t("error_loading") || "Error loading data"}</p>
          <Button onClick={refreshData} variant="outline" className="mt-4">
            {t("try_again") || "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("contractor_dashboard")}</h1>
          <p className="text-muted-foreground">
            {t("manage_your_referrals_and_commissions")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            {t("refresh_data")}
          </Button>
          <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-1">
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>

      {/* Referral Code */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("your_referral_code")}</CardTitle>
          <CardDescription>
            {t("share_to_earn_commissions")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-lg font-mono py-2 px-4">
                {user?.referralCode || "N/A"}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyReferralCode}
                disabled={!user?.referralCode}
              >
                <CopyIcon className="h-4 w-4 mr-1" />
                {t("copy")}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("commission_rate")}:{" "}
              <span className="font-medium">
                {((user?.contractorCommissionRate || 0.0085) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tabs */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="deposits">{t("deposits")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("analytics")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("total_commissions")}
                </CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(commissionSummary?.totalCommissionEarned || 0, "USD")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("total_earnings_to_date")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("referral_volume")}
                </CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(commissionSummary?.totalReferredDeposits || 0, "USD")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("total_deposit_volume")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("active_referrals")}
                </CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {commissionSummary?.activeReferrals || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("clients_with_activity")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("pending_commissions")}
                </CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(commissionSummary?.pendingCommissions || 0, "USD")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("from_pending_deposits")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{t("commission_trend")}</CardTitle>
              <CardDescription>
                {t("monthly_commission_earnings")}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="commissions"
                    name={t("commissions")}
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("recent_deposits")}</CardTitle>
                <CardDescription>
                  {t("latest_client_deposits")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {referredDeposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm font-medium">
                            {deposit.clientUsername || `User #${deposit.userId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(deposit.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-medium">
                          {formatCurrency(deposit.amount, deposit.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          +{formatCurrency(deposit.commission, "USD")} {t("commission")}
                        </span>
                      </div>
                    </div>
                  ))}
                  {referredDeposits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("no_deposits_yet")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("commission_stats")}</CardTitle>
                <CardDescription>
                  {t("deposit_vs_commission")}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    width={500}
                    height={300}
                    data={monthlyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="deposits"
                      name={t("deposits")}
                      fill="#82ca9d"
                    />
                    <Bar
                      dataKey="commissions"
                      name={t("commissions")}
                      fill="#8884d8"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deposits Tab */}
        <TabsContent value="deposits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("referred_client_deposits")}</CardTitle>
              <CardDescription>
                {t("all_deposits_from_your_referrals")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("client")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("amount")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("commission")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("status")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {referredDeposits.map((deposit) => (
                      <tr key={deposit.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {deposit.clientUsername || `User #${deposit.userId}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {formatCurrency(deposit.amount, deposit.currency)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {formatCurrency(deposit.commission, "USD")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Badge
                            variant={
                              deposit.status === "completed"
                                ? "success"
                                : deposit.status === "pending"
                                ? "outline"
                                : "destructive"
                            }
                          >
                            {deposit.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {referredDeposits.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          {t("no_deposits_found")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{t("performance_analytics")}</CardTitle>
              <CardDescription>
                {t("comprehensive_referral_metrics")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{t("summary_statistics")}</h3>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("conversion_rate")}</p>
                      <p className="text-2xl font-bold">
                        {((commissionSummary?.activeReferrals || 0) > 0
                          ? (referredDeposits.length / (commissionSummary?.activeReferrals || 1)) * 100
                          : 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("avg_deposit")}</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          referredDeposits.length > 0
                            ? referredDeposits.reduce((sum, deposit) => sum + deposit.amount, 0) /
                              referredDeposits.length
                            : 0,
                          "USD"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("avg_commission")}</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          referredDeposits.length > 0
                            ? referredDeposits.reduce((sum, deposit) => sum + deposit.commission, 0) /
                              referredDeposits.length
                            : 0,
                          "USD"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("commission_rate")}</p>
                      <p className="text-2xl font-bold">
                        {((user?.contractorCommissionRate || 0.0085) * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">{t("performance_breakdown")}</h3>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("completed_deposits")}</span>
                      <span className="text-sm font-medium">
                        {referredDeposits.filter((d) => d.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("pending_deposits")}</span>
                      <span className="text-sm font-medium">
                        {referredDeposits.filter((d) => d.status === "pending").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("total_volume")}</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(commissionSummary?.totalReferredDeposits || 0, "USD")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t("total_commission")}</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(commissionSummary?.totalCommissionEarned || 0, "USD")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[350px] mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="deposits"
                      name={t("deposit_volume")}
                      stroke="#82ca9d"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="commissions"
                      name={t("commission_earnings")}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">{t("performance_tips")}</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 mr-2 text-primary shrink-0" />
                    {t("tip_share_code")}
                  </li>
                  <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 mr-2 text-primary shrink-0" />
                    {t("tip_educate_clients")}
                  </li>
                  <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 mr-2 text-primary shrink-0" />
                    {t("tip_regular_follow_up")}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractorDashboard;