import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/language-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Label } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import { EmployeeLayout } from "../../pages/employee-dashboard/layout";
import { Skeleton } from "@/components/ui/skeleton";

// Import types from admin analytics
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
  orderCount: number;
  orderAmount: number;
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
    };
    orders: {
      count: number;
      amount: number;
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

const EmployeeChartContainer = ({ children }: { children: React.ReactElement }) => (
  <div className="relative h-[400px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

const AnalyticsSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array(4).fill(0).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  </div>
);

export default function EmployeeAnalytics() {
  const { user } = useUser();
  const t = useTranslations();
  const [, setLocation] = useLocation();

  // Redirect if not an employee
  if (user && !user.isEmployee) {
    console.log('Non-employee user attempted to access analytics:', user.username);
    setLocation('/dashboard');
    return null;
  }

  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/employee/analytics"],
    queryFn: async () => {
      console.log('Fetching employee analytics data');
      try {
        const response = await fetch('/api/employee/analytics', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.error('Failed to fetch analytics:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        console.log('Analytics data received:', {
          dataPreview: JSON.stringify(data).slice(0, 200) + '...',
          timestamp: new Date().toISOString()
        });
        return data;
      } catch (error) {
        console.error('Analytics fetch error:', error);
        throw error;
      }
    },
    enabled: !!user?.isEmployee,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const panels = [
    {
      id: 'analytics',
      title: t('analytics'),
      defaultSize: 100,
      content: (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold mb-6">{t('dashboard_analytics')}</h1>

          {isLoading ? (
            <AnalyticsSkeleton />
          ) : error || !analytics?.yearToDate ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    {error ? t('analytics_error') : t('no_analytics_data')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('please_try_again_later')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title={t('total_transactions')}
                  value={analytics.yearToDate.totalTransactions.toLocaleString()}
                  subtitle={`${t('sepa')}: ${analytics.yearToDate.deposits.count} | USDT: ${analytics.yearToDate.orders.count}`}
                  trend={5.2}
                />
                <StatCard
                  title={t('total_volume')}
                  value={`$${analytics.yearToDate.totalAmount.toLocaleString()}`}
                  subtitle={`${t('sepa')}: $${analytics.yearToDate.deposits.amount.toLocaleString()} | USDT: $${analytics.yearToDate.orders.amount.toLocaleString()}`}
                  trend={3.8}
                />
                <StatCard
                  title={t('active_users')}
                  value={analytics.yearToDate.uniqueActiveUsers.toLocaleString()}
                  subtitle={`${t('total_clients')}: ${analytics.yearToDate.totalClients.toLocaleString()}`}
                  trend={-1.5}
                />
                <StatCard
                  title={t('success_rate')}
                  value={`${(((analytics.yearToDate.deposits.count + analytics.yearToDate.orders.count) / analytics.yearToDate.totalTransactions) * 100).toFixed(1)}%`}
                  subtitle={t('completed_transactions')}
                  trend={0.5}
                />
              </div>

              {/* Period Tabs */}
              <Tabs defaultValue="daily" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                  <TabsTrigger value="daily">{t('daily')}</TabsTrigger>
                  <TabsTrigger value="weekly">{t('weekly')}</TabsTrigger>
                  <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
                </TabsList>

                {/* Daily Analytics */}
                <TabsContent value="daily" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('hourly_activity')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('today_transactions_overview')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EmployeeChartContainer>
                        <BarChart
                          data={analytics.daily.timeline.map(item => ({
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
                      </EmployeeChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Weekly Analytics */}
                <TabsContent value="weekly" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('daily_breakdown')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('weekly_transactions_overview')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EmployeeChartContainer>
                        <LineChart
                          data={analytics.weekly.timeline.map(item => ({
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
                      </EmployeeChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Monthly Analytics */}
                <TabsContent value="monthly" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('monthly_trends')}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('monthly_transactions_overview')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <EmployeeChartContainer>
                        <LineChart
                          data={analytics.monthly.timeline.map(item => ({
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
                      </EmployeeChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      ),
    }
  ];

  return (
    <EmployeeLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">{t('dashboard_analytics')}</h1>
        <div className="grid grid-cols-1 gap-4">
          {panels.map(panel => (
            <Card key={panel.id}>
              <CardHeader>
                <CardTitle>{panel.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {panel.content}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </EmployeeLayout>
  );
}