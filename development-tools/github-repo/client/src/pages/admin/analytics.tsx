import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/language-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Label } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import AdminLayout from "./layout";

// Local ChartContainer component
const AdminChartContainer = ({ children }: { children: React.ReactElement }) => (
  <div className="relative h-[400px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

type TimeData = {
  timestamp: string;
  deposits: number;
  orders: number;
  amount: number;
  activeUsers: number;
};

type PeriodStats = {
  totalTransactions: number;
  totalAmount: number;
  uniqueUsers: number;
  depositCount: number;
  depositAmount: number;
  depositCommissionAmount: number; // Added commission amount
  orderCount: number;
  orderAmount: number;
  successRate: number;
  timeline: TimeData[];
};

type AnalyticsData = {
  daily: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  yearToDate: {
    totalTransactions: number;
    totalAmount: number;
    uniqueActiveUsers: number;
    totalClients: number;
    deposits: {
      count: number;
      amount: number;
      commissionAmount: number; // Added commission amount
    };
    orders: {
      count: number;
      amount: number;
    };
    commissionRate: number; // Added commission rate
    contractors: {
      count: number;
      referredDeposits: number;
      referredAmount: number;
      commissionAmount: number;
    };
  };
};

const chartConfig = {
  margin: { top: 20, right: 30, left: 20, bottom: 30 },
  gridDashArray: "3 3",
  axisHeight: 60,
  axisAngle: -45,
  labelOffset: {
    bottom: 20,
    left: 10,
    right: 10
  },
  lineStrokeWidth: 2,
  dotRadius: { normal: 4, active: 6 },
  legendHeight: 36,
  chartHeight: 400
};

const formatTimestamp = (timestamp: string, type: 'hourly' | 'daily' | 'weekly') => {
  const date = new Date(timestamp);
  switch (type) {
    case 'hourly':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'daily':
      return date.toLocaleDateString([], { weekday: 'short' });
    case 'weekly':
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    default:
      return timestamp;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} className="flex items-center gap-2" style={{ color: pld.color }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pld.color }}></span>
            <span>{pld.name}: </span>
            <span className="font-medium">
              {pld.name.toLowerCase().includes('volume') || pld.name.toLowerCase().includes('amount')
                ? formatCurrency(pld.value)
                : pld.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard = ({ title, value, subtitle, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {trend !== undefined && (
        <span className={`flex items-center ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span className="ml-1 text-xs">{Math.abs(trend)}%</span>
        </span>
      )}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export default function AnalyticsPage() {
  const { user } = useUser();
  const t = useTranslations();
  const [, setLocation] = useLocation();

  if (user && !user.isAdmin) {
    setLocation('/dashboard');
    return null;
  }

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      return response.json();
    },
    enabled: !!user?.isAdmin,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  if (isLoading || !analytics?.yearToDate) {
    return (
      <div className="container py-6">
        <h2 className="text-2xl font-semibold mb-8">{t('dashboard_analytics')}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                {t('analytics_error')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('please_try_again_later')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const yearToDate = analytics.yearToDate;
  const daily = analytics.daily;
  const weekly = analytics.weekly;
  const monthly = analytics.monthly;

  const panels = [{
    id: 'analytics',
    title: t('analytics'),
    defaultSize: 100,
    content: (
      <div className="container py-6">
        <h2 className="text-2xl font-semibold mb-8">{t('dashboard_analytics')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('total_transactions')}
            value={yearToDate.totalTransactions.toLocaleString()}
            subtitle={`${t('sepa')}: ${yearToDate.deposits.count} | USDT/USDC: ${yearToDate.orders.count}`}
            trend={5.2}
          />
          <StatCard
            title={t('total_volume')}
            value={formatCurrency(yearToDate.totalAmount)}
            subtitle={`${t('sepa')}: ${formatCurrency(yearToDate.deposits.amount)} | USDT/USDC: ${formatCurrency(yearToDate.orders.amount)}`}
            trend={3.8}
          />
          <StatCard
            title={t('active_users')}
            value={yearToDate.uniqueActiveUsers.toLocaleString()}
            subtitle={`${t('total_clients')}: ${yearToDate.totalClients.toLocaleString()}`}
            trend={-1.5}
          />
          <StatCard
            title={t('success_rate')}
            value={`${(((yearToDate.deposits.count + yearToDate.orders.count) / yearToDate.totalTransactions) * 100).toFixed(1)}%`}
            subtitle={t('completed_transactions')}
            trend={0.5}
          />
        </div>
        
        {/* Commission Fee Analytics Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">SEPA Deposit Commission Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Commission Rate"
              value={`${(yearToDate.commissionRate * 100).toFixed(0)}%`}
              subtitle="Fixed rate for all SEPA deposits"
            />
            <StatCard
              title="Total Commission Earned"
              value={formatCurrency(yearToDate.deposits.commissionAmount)}
              subtitle={`From ${yearToDate.deposits.count} deposits`}
            />
            <StatCard
              title="Average Commission Per Deposit"
              value={formatCurrency(yearToDate.deposits.count > 0 ? 
                yearToDate.deposits.commissionAmount / yearToDate.deposits.count : 0)}
              subtitle="Per transaction average"
            />
          </div>
        </div>
        
        {/* Commission Fee by Time Period */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Commission by Time Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Daily Commission"
              value={formatCurrency(daily.depositCommissionAmount)}
              subtitle={`From ${daily.depositCount} deposits today`}
            />
            <StatCard
              title="Weekly Commission"
              value={formatCurrency(weekly.depositCommissionAmount)}
              subtitle={`From ${weekly.depositCount} deposits this week`}
            />
            <StatCard
              title="Monthly Commission"
              value={formatCurrency(monthly.depositCommissionAmount)}
              subtitle={`From ${monthly.depositCount} deposits this month`}
            />
          </div>
        </div>
        
        {/* Commission Fee Visualization */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Commission Fee Trends</CardTitle>
            <p className="text-sm text-muted-foreground">
              Weekly comparison of deposit volume vs commission earned
            </p>
          </CardHeader>
          <CardContent>
            <AdminChartContainer>
              <BarChart
                data={weekly.timeline.map(item => ({
                  ...item,
                  timestamp: formatTimestamp(item.timestamp, 'daily'),
                  // Estimate commission for visualization purposes
                  estimatedCommission: item.deposits * (yearToDate.deposits.commissionAmount / yearToDate.deposits.count)
                }))}
                margin={chartConfig.margin}
              >
                <CartesianGrid strokeDasharray={chartConfig.gridDashArray} />
                <XAxis
                  dataKey="timestamp"
                  angle={chartConfig.axisAngle}
                  textAnchor="end"
                  height={chartConfig.axisHeight}
                >
                  <Label value="Day" position="bottom" offset={chartConfig.labelOffset.bottom} />
                </XAxis>
                <YAxis yAxisId="left">
                  <Label value="Volume ($)" angle={-90} position="left" offset={chartConfig.labelOffset.left} />
                </YAxis>
                <YAxis yAxisId="right" orientation="right">
                  <Label value="Commission ($)" angle={90} position="right" offset={chartConfig.labelOffset.right} />
                </YAxis>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={chartConfig.legendHeight} />
                <Bar
                  yAxisId="left"
                  name="Deposit Volume"
                  dataKey="amount"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  name="Commission Earned"
                  dataKey="estimatedCommission"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </AdminChartContainer>
          </CardContent>
        </Card>
        
        {/* Commission Efficiency Metrics */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Commission Efficiency Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Commission Ratio"
              value={`${(yearToDate.deposits.commissionAmount / yearToDate.deposits.amount * 100).toFixed(2)}%`}
              subtitle="Commission as % of post-fee deposit volume"
            />
            <StatCard
              title="Revenue per User"
              value={formatCurrency(yearToDate.uniqueActiveUsers > 0 ? 
                yearToDate.deposits.commissionAmount / yearToDate.uniqueActiveUsers : 0)}
              subtitle="Average commission per active user"
            />
            <StatCard
              title="Commission Trend"
              value={weekly.depositCount > 0 && daily.depositCount > 0 ? 
                `${((daily.depositCommissionAmount / daily.depositCount) / 
                (weekly.depositCommissionAmount / weekly.depositCount) * 100 - 100).toFixed(1)}%` : '0%'}
              subtitle="Daily vs weekly average change"
            />
          </div>
        </div>
        
        {/* Contractor Referral Analytics Section */}
        {yearToDate.contractors && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Contractor Referral Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                title="Active Contractors"
                value={yearToDate.contractors.count.toLocaleString()}
                subtitle="Contractors with referral codes"
              />
              <StatCard
                title="Referred Deposits"
                value={yearToDate.contractors.referredDeposits.toLocaleString()}
                subtitle="Deposits from referred clients"
              />
              <StatCard
                title="Referred Amount"
                value={formatCurrency(yearToDate.contractors.referredAmount)}
                subtitle="Total volume from referred clients"
              />
              <StatCard
                title="Contractor Commissions"
                value={formatCurrency(yearToDate.contractors.commissionAmount)}
                subtitle={`At standard rate of 0.85%`}
              />
            </div>
          </div>
        )}

        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
            <TabsTrigger value="weekly">{t('weekly')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('hourly_activity')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('today_transactions_overview')}
                </p>
              </CardHeader>
              <CardContent>
                <AdminChartContainer>
                  <BarChart
                    data={daily.timeline.map(item => ({
                      ...item,
                      timestamp: formatTimestamp(item.timestamp, 'hourly')
                    }))}
                    margin={chartConfig.margin}
                  >
                    <CartesianGrid strokeDasharray={chartConfig.gridDashArray} />
                    <XAxis
                      dataKey="timestamp"
                      angle={chartConfig.axisAngle}
                      textAnchor="end"
                      height={chartConfig.axisHeight}
                    >
                      <Label value={t('time')} position="bottom" offset={chartConfig.labelOffset.bottom} />
                    </XAxis>
                    <YAxis>
                      <Label value={t('count')} angle={-90} position="left" offset={chartConfig.labelOffset.left} />
                    </YAxis>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={chartConfig.legendHeight} />
                    <Bar
                      name={t('deposits')}
                      dataKey="deposits"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name={t('orders')}
                      dataKey="orders"
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </AdminChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('daily_breakdown')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('weekly_transactions_overview')}
                </p>
              </CardHeader>
              <CardContent>
                <AdminChartContainer>
                  <LineChart
                    data={weekly.timeline.map(item => ({
                      ...item,
                      timestamp: formatTimestamp(item.timestamp, 'daily')
                    }))}
                    margin={chartConfig.margin}
                  >
                    <CartesianGrid strokeDasharray={chartConfig.gridDashArray} />
                    <XAxis
                      dataKey="timestamp"
                      angle={chartConfig.axisAngle}
                      textAnchor="end"
                      height={chartConfig.axisHeight}
                    >
                      <Label value={t('day')} position="bottom" offset={chartConfig.labelOffset.bottom} />
                    </XAxis>
                    <YAxis yAxisId="left">
                      <Label value={t('volume')} angle={-90} position="left" offset={chartConfig.labelOffset.left} />
                    </YAxis>
                    <YAxis yAxisId="right" orientation="right">
                      <Label value={t('users')} angle={90} position="right" offset={chartConfig.labelOffset.right} />
                    </YAxis>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={chartConfig.legendHeight} />
                    <Line
                      yAxisId="left"
                      name={t('transaction_volume')}
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={chartConfig.lineStrokeWidth}
                      dot={{ r: chartConfig.dotRadius.normal }}
                      activeDot={{ r: chartConfig.dotRadius.active }}
                    />
                    <Line
                      yAxisId="right"
                      name={t('active_users')}
                      type="monotone"
                      dataKey="activeUsers"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={chartConfig.lineStrokeWidth}
                      dot={{ r: chartConfig.dotRadius.normal }}
                      activeDot={{ r: chartConfig.dotRadius.active }}
                    />
                  </LineChart>
                </AdminChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('monthly_trends')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('monthly_transactions_overview')}
                </p>
              </CardHeader>
              <CardContent>
                <AdminChartContainer>
                  <LineChart
                    data={monthly.timeline.map(item => ({
                      ...item,
                      timestamp: formatTimestamp(item.timestamp, 'weekly')
                    }))}
                    margin={chartConfig.margin}
                  >
                    <CartesianGrid strokeDasharray={chartConfig.gridDashArray} />
                    <XAxis
                      dataKey="timestamp"
                      angle={chartConfig.axisAngle}
                      textAnchor="end"
                      height={chartConfig.axisHeight}
                    >
                      <Label value={t('week')} position="bottom" offset={chartConfig.labelOffset.bottom} />
                    </XAxis>
                    <YAxis yAxisId="left">
                      <Label value={t('volume')} angle={-90} position="left" offset={chartConfig.labelOffset.left} />
                    </YAxis>
                    <YAxis yAxisId="right" orientation="right">
                      <Label value={t('users')} angle={90} position="right" offset={chartConfig.labelOffset.right} />
                    </YAxis>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={chartConfig.legendHeight} />
                    <Line
                      yAxisId="left"
                      name={t('transaction_volume')}
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={chartConfig.lineStrokeWidth}
                      dot={{ r: chartConfig.dotRadius.normal }}
                      activeDot={{ r: chartConfig.dotRadius.active }}
                    />
                    <Line
                      yAxisId="right"
                      name={t('active_users')}
                      type="monotone"
                      dataKey="activeUsers"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={chartConfig.lineStrokeWidth}
                      dot={{ r: chartConfig.dotRadius.normal }}
                      activeDot={{ r: chartConfig.dotRadius.active }}
                    />
                  </LineChart>
                </AdminChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    ),
  }];

  return <AdminLayout panels={panels} />;
}