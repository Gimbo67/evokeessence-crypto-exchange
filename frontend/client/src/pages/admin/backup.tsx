import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock, Send, Trash, ServerCrash, RefreshCw, Database, HardDrive, Cloud, Upload, Download, Server, BarChart, RotateCw, Trash2, Minimize } from "lucide-react";
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Define types for the backup data
interface BackupFile {
  filename: string;
  size: number;
  date: string;
  created: string;
  verified?: boolean;
}

interface BackupStatistics {
  totalBackups: number;
  dbBackups: number;
  fileBackups: number;
  incrementalBackups: number;
  totalSize: number;
  totalSizeFormatted: string;
  latestDbBackup: BackupFile | null;
  latestFileBackup: BackupFile | null;
  latestIncrementalBackup: BackupFile | null;
  cloudBackups: number;
}

interface VerificationStatus {
  lastRun: string | null;
  success: boolean;
  summary: string;
}

interface BackupConfiguration {
  backupDirectory: string;
  cronStatus: string;
  remoteServersConfigured: number;
  cloudBackupEnabled: boolean;
}

interface RecentBackups {
  database: BackupFile[];
  files: BackupFile[];
  incremental: BackupFile[];
  cloud: any[];
}

interface Server {
  name: string;
  address: string;
  status: string;
}

interface BackupStatus {
  status: string;
  statistics: BackupStatistics;
  verification: VerificationStatus;
  configuration: BackupConfiguration;
  recentBackups: RecentBackups;
  remoteServers: Server[];
}

// Mock data for development and testing
const mockBackupStatus: BackupStatus = {
  status: 'operational',
  statistics: {
    totalBackups: 42,
    dbBackups: 14,
    fileBackups: 14,
    incrementalBackups: 14,
    totalSize: 1073741824, // 1GB
    totalSizeFormatted: '1.0 GB',
    latestDbBackup: {
      filename: 'database-backup-2025-03-24.sql.gz',
      size: 104857600, // 100MB
      date: '2025-03-24T10:00:00Z',
      created: '2025-03-24T10:00:00Z',
      verified: true
    },
    latestFileBackup: {
      filename: 'files-backup-2025-03-24.tar.gz',
      size: 524288000, // 500MB
      date: '2025-03-24T10:00:00Z',
      created: '2025-03-24T10:00:00Z',
      verified: true
    },
    latestIncrementalBackup: {
      filename: 'incremental-backup-2025-03-24.tar.gz',
      size: 52428800, // 50MB
      date: '2025-03-24T11:00:00Z',
      created: '2025-03-24T11:00:00Z'
    },
    cloudBackups: 7
  },
  verification: {
    lastRun: '2025-03-24T09:00:00Z',
    success: true,
    summary: 'All backups verified successfully'
  },
  configuration: {
    backupDirectory: '/app/backups',
    cronStatus: 'Active',
    remoteServersConfigured: 2,
    cloudBackupEnabled: true
  },
  recentBackups: {
    database: [
      {
        filename: 'database-backup-2025-03-24.sql.gz',
        size: 104857600,
        date: '2025-03-24T10:00:00Z',
        created: '2025-03-24T10:00:00Z',
        verified: true
      },
      {
        filename: 'database-backup-2025-03-23.sql.gz',
        size: 102400000,
        date: '2025-03-23T10:00:00Z',
        created: '2025-03-23T10:00:00Z',
        verified: true
      }
    ],
    files: [
      {
        filename: 'files-backup-2025-03-24.tar.gz',
        size: 524288000,
        date: '2025-03-24T10:00:00Z',
        created: '2025-03-24T10:00:00Z',
        verified: true
      },
      {
        filename: 'files-backup-2025-03-23.tar.gz',
        size: 520093696,
        date: '2025-03-23T10:00:00Z',
        created: '2025-03-23T10:00:00Z',
        verified: true
      }
    ],
    incremental: [
      {
        filename: 'incremental-backup-2025-03-24.tar.gz',
        size: 52428800,
        date: '2025-03-24T11:00:00Z',
        created: '2025-03-24T11:00:00Z'
      },
      {
        filename: 'incremental-backup-2025-03-24-06.tar.gz',
        size: 41943040,
        date: '2025-03-24T06:00:00Z',
        created: '2025-03-24T06:00:00Z'
      }
    ],
    cloud: []
  },
  remoteServers: [
    {
      name: 'Backup Server 1',
      address: 'backup-1.example.com',
      status: 'Connected'
    },
    {
      name: 'Backup Server 2',
      address: 'backup-2.example.com',
      status: 'Connected'
    }
  ]
};

interface LogData {
  type: string;
  filename: string;
  lines: string[];
}

// Define types for notification settings
interface NotificationConfig {
  enabled: boolean;
  email: {
    enabled: boolean;
    recipients: string[];
  };
  levels: {
    success: boolean;
    info: boolean;
    warning: boolean;
    error: boolean;
  };
  scheduled: boolean;
}

// Define types for schedule data
interface Schedule {
  name: string;
  enabled: boolean;
  description: string;
  cron: string;
  components: string[];
  lastRun: string;
  nextRun: string;
  status: string;
}

// Define types for geo-replication data
interface GeoRegion {
  name: string;
  description?: string;
  type?: string;
  hostname?: string;
  status?: string;
}

interface SyncHistory {
  timestamp: string;
  region: string;
  status: string;
  files: string;
  duration: string;
}

interface GeoReplication {
  enabled: boolean;
  regions: GeoRegion[];
  strategy: any;
  history: SyncHistory[];
}

// Define form schemas
const emailFormSchema = z.object({
  enabled: z.boolean(),
  recipients: z.string().min(5, 'At least one valid email is required'),
  smtpServer: z.string().min(1, 'SMTP server is required'),
  smtpPort: z.string().min(1, 'SMTP port is required'),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromAddress: z.string().email('From address must be a valid email'),
});

const scheduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  enabled: z.boolean(),
  cronExpression: z.string().min(1, 'Cron expression is required'),
});

const regionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hostname: z.string().min(1, 'Hostname is required'),
  directory: z.string().min(1, 'Backup directory is required'),
  user: z.string().min(1, 'SSH user is required'),
  keyPath: z.string().min(1, 'SSH key path is required'),
  port: z.string().default('22'),
});

export default function BackupDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [logType, setLogType] = useState('backup');
  
  // Define storage analysis data types
  interface StorageHistoryEntry {
    date: string;
    totalSize: number;
    dbSize: number;
    filesSize: number;
    incrementalSize: number;
    backupCount: number;
    totalSizeFormatted: string;
  }
  
  interface GrowthMetrics {
    dailyGrowth: number;
    dailyGrowthFormatted: string;
    weeklyGrowth: number;
    weeklyGrowthFormatted: string;
    monthlyGrowth: number;
    monthlyGrowthFormatted: string;
    projectedSizeIn30Days: number;
    projectedSizeIn30DaysFormatted: string;
    projectedSizeIn90Days: number;
    projectedSizeIn90DaysFormatted: string;
    daysUntilFull: number | null;
    warningLevel: 'normal' | 'warning' | 'critical';
  }
  
  interface StorageAnalysisData {
    report: string;
    chart: string;
    history: StorageHistoryEntry[];
    growthMetrics: GrowthMetrics;
  }
  
  // Fetch backup status
  const {
    data: backupStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['backup', 'status'],
    queryFn: async () => {
      const response = await axios.get<BackupStatus>('/api/admin/backup/status');
      return response.data;
    }
  });

  // Fetch backup logs
  const {
    data: logData,
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs
  } = useQuery({
    queryKey: ['backup', 'logs', logType],
    queryFn: async () => {
      const response = await axios.get<LogData>(`/api/admin/backup/logs?type=${logType}`);
      return response.data;
    }
  });

  // Fetch notification settings
  const {
    data: notificationData,
    isLoading: isLoadingNotifications,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ['backup', 'notifications'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; config: NotificationConfig }>('/api/admin/backup/notifications');
      return response.data.config;
    },
    enabled: activeTab === 'notifications'
  });

  // Fetch schedule data
  const {
    data: scheduleData,
    isLoading: isLoadingSchedule,
    error: scheduleError,
    refetch: refetchSchedule
  } = useQuery({
    queryKey: ['backup', 'schedule'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; schedules: Schedule[] }>('/api/admin/backup/schedule');
      return response.data.schedules;
    },
    enabled: activeTab === 'schedule'
  });

  // Fetch geo-replication data
  const {
    data: geoReplicationData,
    isLoading: isLoadingGeoReplication,
    error: geoReplicationError,
    refetch: refetchGeoReplication
  } = useQuery({
    queryKey: ['backup', 'geo-replication'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; geoReplication: GeoReplication }>('/api/admin/backup/geo-replication');
      return response.data.geoReplication;
    },
    enabled: activeTab === 'geo-replication'
  });
  
  // Fetch storage analysis data
  const {
    data: storageAnalysisData,
    isLoading: isLoadingStorageAnalysis,
    error: storageAnalysisError,
    refetch: refetchStorageAnalysis
  } = useQuery({
    queryKey: ['backup', 'storage-analysis'],
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; data: StorageAnalysisData }>('/api/admin/backup/storage-analysis');
      return response.data.data;
    },
    enabled: activeTab === 'storage'
  });

  // Mutations
  const triggerBackupMutation = useMutation({
    mutationFn: async (backupType: string) => {
      return await axios.post('/api/admin/backup/trigger', { type: backupType });
    },
    onSuccess: () => {
      toast({
        title: 'Backup Initiated',
        description: 'The backup process has been started successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'status'] });
    },
    onError: (error) => {
      toast({
        title: 'Backup Failed',
        description: 'Failed to start the backup process.',
        variant: 'destructive',
      });
    },
  });

  const triggerVerificationMutation = useMutation({
    mutationFn: async (level: string) => {
      return await axios.post('/api/admin/backup/verify', { level });
    },
    onSuccess: () => {
      toast({
        title: 'Verification Initiated',
        description: 'The backup verification process has been started.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'status'] });
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: 'Failed to start the verification process.',
        variant: 'destructive',
      });
    },
  });

  const triggerCloudBackupMutation = useMutation({
    mutationFn: async (options: { provider: string; encrypt: boolean }) => {
      return await axios.post('/api/admin/backup/cloud', options);
    },
    onSuccess: () => {
      toast({
        title: 'Cloud Backup Initiated',
        description: 'The cloud backup process has been started.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'status'] });
    },
    onError: (error) => {
      toast({
        title: 'Cloud Backup Failed',
        description: 'Failed to start the cloud backup process.',
        variant: 'destructive',
      });
    },
  });

  const updateNotificationSettingsMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; level?: string }) => {
      return await axios.post('/api/admin/backup/notifications', data);
    },
    onSuccess: () => {
      toast({
        title: 'Notification Settings Updated',
        description: 'The notification settings have been updated successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'notifications'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update notification settings.',
        variant: 'destructive',
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { scheduleName: string; enabled?: boolean; cronExpression?: string }) => {
      return await axios.post('/api/admin/backup/schedule', data);
    },
    onSuccess: () => {
      toast({
        title: 'Schedule Updated',
        description: 'The backup schedule has been updated successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'schedule'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update backup schedule.',
        variant: 'destructive',
      });
    },
  });

  const updateGeoReplicationMutation = useMutation({
    mutationFn: async (data: { action: string; enabled?: boolean; region?: any }) => {
      return await axios.post('/api/admin/backup/geo-replication', data);
    },
    onSuccess: () => {
      toast({
        title: 'Geo-Replication Updated',
        description: 'The geo-replication settings have been updated successfully.',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['backup', 'geo-replication'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update geo-replication settings.',
        variant: 'destructive',
      });
    },
  });

  const testServerMutation = useMutation({
    mutationFn: async (name: string) => {
      return await axios.post('/api/admin/backup/test-server', { name });
    },
    onSuccess: (response) => {
      toast({
        title: 'Server Test Successful',
        description: response.data?.message || 'Successfully connected to the remote server.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Server Test Failed',
        description: 'Failed to connect to the remote server.',
        variant: 'destructive',
      });
    },
  });

  // Form handling
  const emailForm = useForm({
    defaultValues: {
      enabled: notificationData?.email?.enabled || false,
      recipients: notificationData?.email?.recipients?.join(', ') || '',
      smtpServer: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPassword: '',
      fromAddress: 'backup-system@example.com',
    },
  });

  const scheduleForm = useForm({
    defaultValues: {
      name: '',
      enabled: true,
      cronExpression: '0 1 * * *',
    },
  });
  
  const regionForm = useForm({
    defaultValues: {
      name: '',
      hostname: '',
      directory: '/app/backups',
      user: 'backup',
      keyPath: '',
      port: '22',
    },
  });

  // Status indicator colors
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-500';
    
    switch (status.toLowerCase()) {
      case 'operational':
      case 'connected':
      case 'success':
        return 'bg-green-500';
      case 'warning':
      case 'pending':
        return 'bg-yellow-500';
      case 'error':
      case 'failed':
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Refresh data when switching tabs
    if (value === 'logs') {
      refetchLogs();
    } else if (value === 'notifications') {
      refetchNotifications();
    } else if (value === 'schedule') {
      refetchSchedule();
    } else if (value === 'geo-replication') {
      refetchGeoReplication();
    } else if (value === 'storage') {
      refetchStorageAnalysis();
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Content renderers
  const renderStatusOverview = () => {
    if (isLoadingStatus) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <span>Loading backup status...</span>
        </div>
      );
    }

    if (statusError) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <AlertCircle className="mr-2 h-8 w-8" />
          <span>Error loading backup status. Please try again.</span>
        </div>
      );
    }

    if (!backupStatus || !backupStatus.statistics) {
      return (
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="mr-2 h-8 w-8" />
          <span>No backup data available. Setup may be required.</span>
        </div>
      );
    }

    // Create a default stats object with fallback values to prevent errors
    const stats: BackupStatistics = Object.assign({
      totalBackups: 0,
      dbBackups: 0,
      fileBackups: 0,
      incrementalBackups: 0,
      cloudBackups: 0,
      totalSize: 0,
      totalSizeFormatted: '0 MB',
      latestDbBackup: null,
      latestFileBackup: null,
      latestIncrementalBackup: null
    }, backupStatus.statistics || {});
    
    // Ensure latestDbBackup, latestFileBackup and latestIncrementalBackup are defined as BackupFile objects
    if (stats.latestDbBackup) {
      stats.latestDbBackup = stats.latestDbBackup as BackupFile;
    }
    if (stats.latestFileBackup) {
      stats.latestFileBackup = stats.latestFileBackup as BackupFile;
    }
    if (stats.latestIncrementalBackup) {
      stats.latestIncrementalBackup = stats.latestIncrementalBackup as BackupFile;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>System Status</span>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(backupStatus.status)}`}></div>
                <span>{backupStatus.status === 'operational' ? 'Operational' : 'Needs Attention'}</span>
              </div>
            </CardTitle>
            <CardDescription>
              Overall system health and status of the backup infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Backups</div>
                <div className="text-2xl font-bold">{stats.totalBackups}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Size</div>
                <div className="text-2xl font-bold">{stats.totalSizeFormatted}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Last Verified</div>
                <div className="text-lg font-semibold">
                  {backupStatus.verification.lastRun ? formatDate(backupStatus.verification.lastRun) : 'Never'}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Cron Status</div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${backupStatus.configuration.cronStatus === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <div className="font-semibold">{backupStatus.configuration.cronStatus}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Backups</CardTitle>
            <CardDescription>
              The most recent backup files by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-3">
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Database</span>
                </div>
                {stats.latestDbBackup ? (
                  (() => {
                    // Cast to proper type to avoid TypeScript errors
                    const backup = stats.latestDbBackup as BackupFile;
                    return (
                      <div className="mt-2">
                        <div className="text-sm">{backup.filename}</div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>{formatDate(backup.created)}</span>
                          <span>{Math.round(backup.size / 1024 / 1024)} MB</span>
                        </div>
                        <div className="flex items-center mt-1">
                          {backup.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                          )}
                          <span className="text-sm">{backup.verified ? 'Verified' : 'Not Verified'}</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">No database backups available</div>
                )}
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Files</span>
                </div>
                {stats.latestFileBackup ? (
                  (() => {
                    // Cast to proper type to avoid TypeScript errors
                    const backup = stats.latestFileBackup as BackupFile;
                    return (
                      <div className="mt-2">
                        <div className="text-sm">{backup.filename}</div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>{formatDate(backup.created)}</span>
                          <span>{Math.round(backup.size / 1024 / 1024)} MB</span>
                        </div>
                        <div className="flex items-center mt-1">
                          {backup.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                          )}
                          <span className="text-sm">{backup.verified ? 'Verified' : 'Not Verified'}</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">No file backups available</div>
                )}
              </div>

              <div className="border rounded-lg p-3">
                <div className="flex items-center">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Incremental</span>
                </div>
                {stats.latestIncrementalBackup ? (
                  (() => {
                    // Cast to proper type to avoid TypeScript errors
                    const backup = stats.latestIncrementalBackup as BackupFile;
                    return (
                      <div className="mt-2">
                        <div className="text-sm">{backup.filename}</div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>{formatDate(backup.created)}</span>
                          <span>{Math.round(backup.size / 1024 / 1024)} MB</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground mt-2">No incremental backups available</div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleTabChange('backups')}
            >
              View All Backups
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Trigger manual backup operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-semibold">Start Backup</div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => triggerBackupMutation.mutate('full')}
                    disabled={triggerBackupMutation.isPending}
                  >
                    {triggerBackupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Full Backup
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => triggerBackupMutation.mutate('database')}
                    disabled={triggerBackupMutation.isPending}
                  >
                    Database Only
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => triggerBackupMutation.mutate('files')}
                    disabled={triggerBackupMutation.isPending}
                  >
                    Files Only
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => triggerBackupMutation.mutate('incremental')}
                    disabled={triggerBackupMutation.isPending}
                  >
                    Incremental
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold">Verification</div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => triggerVerificationMutation.mutate('basic')}
                    disabled={triggerVerificationMutation.isPending}
                  >
                    {triggerVerificationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Basic Check
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => triggerVerificationMutation.mutate('thorough')}
                    disabled={triggerVerificationMutation.isPending}
                  >
                    Thorough
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => triggerVerificationMutation.mutate('full')}
                    disabled={triggerVerificationMutation.isPending}
                  >
                    Full Verify
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold">Cloud Storage</div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => triggerCloudBackupMutation.mutate({ provider: 'default', encrypt: true })}
                    disabled={triggerCloudBackupMutation.isPending}
                  >
                    {triggerCloudBackupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Cloud className="mr-2 h-4 w-4" />
                    Upload to Cloud
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Remote Servers</CardTitle>
            <CardDescription>
              Status of configured remote backup servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backupStatus.remoteServers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No remote servers configured. Add servers in the servers tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {backupStatus.remoteServers.map((server, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Server className="h-5 w-5 mr-2" />
                        <span className="font-semibold">{server.name}</span>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(server.status)}`}></div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">{server.address}</div>
                    <div className="flex items-center mt-2">
                      <Badge variant={server.status === 'Connected' ? 'default' : 'secondary'}>
                        {server.status}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => testServerMutation.mutate(server.name)}
                      disabled={testServerMutation.isPending}
                    >
                      {testServerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Test Connection
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleTabChange('servers')}
            >
              Manage Servers
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderBackupsTab = () => {
    if (isLoadingStatus) {
      return <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading backup files...</span>
      </div>;
    }

    if (!backupStatus || !backupStatus.recentBackups) return null;
    
    // Create default empty arrays for backup types if not present
    const recentBackups: RecentBackups = backupStatus?.recentBackups ? {
      ...backupStatus.recentBackups,
      database: (backupStatus.recentBackups.database || []) as BackupFile[],
      files: (backupStatus.recentBackups.files || []) as BackupFile[],
      incremental: (backupStatus.recentBackups.incremental || []) as BackupFile[],
      cloud: backupStatus.recentBackups.cloud || []
    } : {
      database: [] as BackupFile[],
      files: [] as BackupFile[],
      incremental: [] as BackupFile[],
      cloud: []
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Backups</CardTitle>
            <CardDescription>
              PostgreSQL database backup files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBackups.database.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No database backups available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBackups.database.map((backup, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                      <TableCell>{formatDate(backup.created)}</TableCell>
                      <TableCell>{Math.round(backup.size / 1024 / 1024)} MB</TableCell>
                      <TableCell>
                        {backup.verified ? (
                          <Badge variant="default" className="flex items-center bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>File Backups</CardTitle>
            <CardDescription>
              Application files and assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBackups.files.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No file backups available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBackups.files.map((backup, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                      <TableCell>{formatDate(backup.created)}</TableCell>
                      <TableCell>{Math.round(backup.size / 1024 / 1024)} MB</TableCell>
                      <TableCell>
                        {backup.verified ? (
                          <Badge variant="default" className="flex items-center bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incremental Backups</CardTitle>
            <CardDescription>
              Storage-efficient changes only backups
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentBackups.incremental.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No incremental backups available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBackups.incremental.map((backup, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                      <TableCell>{formatDate(backup.created)}</TableCell>
                      <TableCell>{Math.round(backup.size / 1024 / 1024)} MB</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloud Backups</CardTitle>
            <CardDescription>
              Backups stored in cloud providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!recentBackups.cloud || recentBackups.cloud.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No cloud backups available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBackups.cloud.map((backup, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                      <TableCell>{backup.provider}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLogsTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backup System Logs</CardTitle>
            <CardDescription>
              View logs for various backup operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button 
                variant={logType === 'backup' ? 'default' : 'outline'} 
                onClick={() => setLogType('backup')}
              >
                Backup Logs
              </Button>
              <Button 
                variant={logType === 'restore' ? 'default' : 'outline'} 
                onClick={() => setLogType('restore')}
              >
                Restore Logs
              </Button>
              <Button 
                variant={logType === 'verification' ? 'default' : 'outline'} 
                onClick={() => setLogType('verification')}
              >
                Verification Logs
              </Button>
              <Button 
                variant={logType === 'cron' ? 'default' : 'outline'} 
                onClick={() => setLogType('cron')}
              >
                Cron Logs
              </Button>
              <Button 
                variant={logType === 'cloud' ? 'default' : 'outline'} 
                onClick={() => setLogType('cloud')}
              >
                Cloud Logs
              </Button>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : logsError ? (
              <div className="text-center py-8 text-red-500">
                Error loading logs
              </div>
            ) : !logData?.lines || logData.lines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No log entries available
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                {logData.lines.map((line, i) => (
                  <div key={i} className={i % 2 === 0 ? '' : 'bg-muted/50'}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => refetchLogs()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Logs
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderServersTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Remote Backup Servers</CardTitle>
            <CardDescription>
              Configure and manage remote servers for backup replication
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !backupStatus?.remoteServers || backupStatus.remoteServers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No remote servers configured
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupStatus.remoteServers.map((server, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{server.name}</TableCell>
                      <TableCell>{server.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(server.status)}`}></div>
                          {server.status}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => testServerMutation.mutate(server.name)}
                            disabled={testServerMutation.isPending}
                          >
                            Test
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Server</CardTitle>
            <CardDescription>
              Configure a new remote server for backup replication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...emailForm}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server Name</label>
                    <Input placeholder="e.g., backup-server-1" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Server Address</label>
                    <Input placeholder="e.g., backup.example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SSH Username</label>
                    <Input placeholder="e.g., backup" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SSH Port</label>
                    <Input placeholder="22" type="number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SSH Key Path</label>
                  <Input placeholder="e.g., /path/to/private_key" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Backup Directory</label>
                  <Input placeholder="e.g., /app/backups" />
                </div>
              </div>
            </Form>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Add Server
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderNotificationsTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Email Notifications</span>
              <Switch 
                checked={notificationData?.email?.enabled || false}
                onCheckedChange={(checked) => {
                  updateNotificationSettingsMutation.mutate({
                    enabled: checked,
                    level: 'email'
                  });
                }}
              />
            </CardTitle>
            <CardDescription>
              Configure email notifications for backup events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Form {...emailForm}>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Server</label>
                      <Input placeholder="e.g., smtp.example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Port</label>
                      <Input placeholder="587" type="number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Username</label>
                      <Input placeholder="e.g., user@example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Password</label>
                      <Input placeholder="Password" type="password" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Email Address</label>
                    <Input placeholder="e.g., backup-system@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipients (comma-separated)</label>
                    <Input placeholder="e.g., admin@example.com, alerts@example.com" />
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Save Email Settings
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Levels</CardTitle>
            <CardDescription>
              Configure which events trigger notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Success Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Notify when backup operations complete successfully
                    </div>
                  </div>
                  <Switch 
                    checked={notificationData?.levels?.success || false}
                    onCheckedChange={(checked) => {
                      updateNotificationSettingsMutation.mutate({
                        enabled: checked,
                        level: 'success'
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Info Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Notify about general informational events
                    </div>
                  </div>
                  <Switch 
                    checked={notificationData?.levels?.info || false}
                    onCheckedChange={(checked) => {
                      updateNotificationSettingsMutation.mutate({
                        enabled: checked,
                        level: 'info'
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Warning Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Notify about potential issues that need attention
                    </div>
                  </div>
                  <Switch 
                    checked={notificationData?.levels?.warning || false}
                    onCheckedChange={(checked) => {
                      updateNotificationSettingsMutation.mutate({
                        enabled: checked,
                        level: 'warning'
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">Error Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Notify about critical errors and failures
                    </div>
                  </div>
                  <Switch 
                    checked={notificationData?.levels?.error || false}
                    onCheckedChange={(checked) => {
                      updateNotificationSettingsMutation.mutate({
                        enabled: checked,
                        level: 'error'
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scheduled Reports</span>
              <Switch 
                checked={notificationData?.scheduled || false}
                onCheckedChange={(checked) => {
                  updateNotificationSettingsMutation.mutate({
                    enabled: checked,
                    level: 'scheduled'
                  });
                }}
              />
            </CardTitle>
            <CardDescription>
              Configure periodic backup status reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Frequency</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Time</label>
                  <Input placeholder="06:00" />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Save Report Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderScheduleTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backup Schedules</CardTitle>
            <CardDescription>
              Configure custom schedules for different backup types
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSchedule ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : scheduleError ? (
              <div className="text-center py-4 text-red-500">
                Error loading schedule data
              </div>
            ) : !scheduleData || scheduleData.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No schedules configured
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {scheduleData.map((schedule, index) => (
                  <AccordionItem key={index} value={schedule.name}>
                    <AccordionTrigger>
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${schedule.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span>{schedule.name}</span>
                        {schedule.status === 'DUE NOW' && (
                          <Badge variant="secondary" className="ml-2">Due Now</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Enabled</div>
                          <Switch 
                            checked={schedule.enabled}
                            onCheckedChange={(checked) => {
                              updateScheduleMutation.mutate({
                                scheduleName: schedule.name,
                                enabled: checked
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">Description</div>
                          <div className="text-sm text-muted-foreground">{schedule.description}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">Cron Expression</div>
                          <div className="flex items-center">
                            <code className="bg-muted px-2 py-1 rounded text-sm">{schedule.cron}</code>
                            <Button variant="ghost" size="sm" className="ml-2">
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium">Components</div>
                          <div className="flex flex-wrap gap-1">
                            {schedule.components.map((component, i) => (
                              <Badge key={i} variant="outline">
                                {component}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="font-medium">Last Run</div>
                            <div className="text-sm">{schedule.lastRun === 'Never' ? 'Never' : formatDate(schedule.lastRun)}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-medium">Next Run</div>
                            <div className="text-sm">{formatDate(schedule.nextRun)}</div>
                          </div>
                        </div>
                        <div className="pt-2 flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            Run Now
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create New Schedule</CardTitle>
            <CardDescription>
              Define a new custom backup schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...scheduleForm}>
              <form className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule Name</label>
                  <Input placeholder="e.g., nightly-full-backup" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule Description</label>
                  <Input placeholder="e.g., Full backup every night" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cron Expression</label>
                  <Input placeholder="e.g., 0 1 * * *" />
                  <p className="text-xs text-muted-foreground">Format: minute hour day-of-month month day-of-week</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Components</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="database" />
                      <label htmlFor="database" className="text-sm font-medium">Database Backup</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="files" />
                      <label htmlFor="files" className="text-sm font-medium">Files Backup</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="incremental" />
                      <label htmlFor="incremental" className="text-sm font-medium">Incremental Backup</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="verification" />
                      <label htmlFor="verification" className="text-sm font-medium">Verification</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="cloud" />
                      <label htmlFor="cloud" className="text-sm font-medium">Cloud Backup</label>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Button className="w-full">
              Create Schedule
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Storage Analysis Tab
  const renderStorageAnalysisTab = () => {
    if (isLoadingStorageAnalysis) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <span>Loading storage analysis data...</span>
        </div>
      );
    }

    if (storageAnalysisError) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <AlertCircle className="mr-2 h-8 w-8" />
          <span>Error loading storage analysis data. Please try again.</span>
        </div>
      );
    }

    if (!storageAnalysisData) {
      return (
        <div className="flex items-center justify-center p-8">
          <AlertCircle className="mr-2 h-8 w-8" />
          <span>No storage analysis data available. Run the backup analyzer to generate insights.</span>
        </div>
      );
    }

    const { history, growthMetrics } = storageAnalysisData;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Storage Growth Analysis</CardTitle>
            <CardDescription>
              Backup storage trends and growth projections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`bg-muted rounded-lg p-4 ${
                growthMetrics.warningLevel === 'critical' ? 'border-red-500 border-2' : 
                growthMetrics.warningLevel === 'warning' ? 'border-yellow-500 border-2' : ''
              }`}>
                <h4 className="text-sm font-medium mb-2">Storage Growth Rate</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily:</span>
                    <span className="font-medium">{growthMetrics.dailyGrowthFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Weekly:</span>
                    <span className="font-medium">{growthMetrics.weeklyGrowthFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monthly:</span>
                    <span className="font-medium">{growthMetrics.monthlyGrowthFormatted}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Projected Storage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">In 30 days:</span>
                    <span className="font-medium">{growthMetrics.projectedSizeIn30DaysFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">In 90 days:</span>
                    <span className="font-medium">{growthMetrics.projectedSizeIn90DaysFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Days until full:</span>
                    <span className="font-medium">
                      {growthMetrics.daysUntilFull !== null ? 
                        growthMetrics.daysUntilFull.toString() : 
                        'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Storage Alert</h4>
                <div className="flex items-center mb-3">
                  <div className={`h-3 w-3 rounded-full mr-2 ${
                    growthMetrics.warningLevel === 'critical' ? 'bg-red-500' : 
                    growthMetrics.warningLevel === 'warning' ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}></div>
                  <span className="font-medium">
                    {growthMetrics.warningLevel === 'critical' ? 'Critical' : 
                     growthMetrics.warningLevel === 'warning' ? 'Warning' : 
                     'Normal'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {growthMetrics.warningLevel === 'critical' ? 
                    'Storage space is critically low. Immediate action required.' : 
                    growthMetrics.warningLevel === 'warning' ? 
                    'Storage growing quickly. Consider cleanup or expanding storage.' : 
                    'Storage usage is within normal parameters.'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Historical Storage Trend</h4>
              <div className="h-64 w-full">
                {/* Placeholder for chart - in a real implementation, use Recharts or similar */}
                <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <BarChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Storage usage chart visualization would appear here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage History</CardTitle>
            <CardDescription>
              Historical backup storage analysis by date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Size</TableHead>
                  <TableHead className="hidden md:table-cell">Database</TableHead>
                  <TableHead className="hidden md:table-cell">Files</TableHead>
                  <TableHead className="hidden md:table-cell">Incremental</TableHead>
                  <TableHead className="hidden md:table-cell">Backups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.totalSizeFormatted}</TableCell>
                    <TableCell className="hidden md:table-cell">{Math.round(entry.dbSize / 1024 / 1024)} MB</TableCell>
                    <TableCell className="hidden md:table-cell">{Math.round(entry.filesSize / 1024 / 1024)} MB</TableCell>
                    <TableCell className="hidden md:table-cell">{Math.round(entry.incrementalSize / 1024 / 1024)} MB</TableCell>
                    <TableCell className="hidden md:table-cell">{entry.backupCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Analysis Actions</CardTitle>
            <CardDescription>
              Tools for managing backup storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Analysis Tools</h4>
                <div className="space-y-2">
                  <Button 
                    className="w-full"
                    onClick={() => toast({
                      title: "Analysis Started",
                      description: "Storage analysis has been initiated.",
                    })}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run New Analysis
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => refetchStorageAnalysis()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Data
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Maintenance</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toast({
                      title: "Cleanup Started",
                      description: "Storage cleanup process has been initiated.",
                    })}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Cleanup Old Backups
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => toast({
                      title: "Compression Started",
                      description: "Backup compression process has been initiated.",
                    })}
                  >
                    <Minimize className="mr-2 h-4 w-4" />
                    Compress Backups
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGeoReplicationTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Geographic Replication</span>
              <Switch 
                checked={geoReplicationData?.enabled || false}
                onCheckedChange={(checked) => {
                  updateGeoReplicationMutation.mutate({
                    action: 'configure',
                    enabled: checked
                  });
                }}
                disabled={isLoadingGeoReplication || updateGeoReplicationMutation.isPending}
              />
            </CardTitle>
            <CardDescription>
              Replicate backups to remote geographic regions for disaster recovery
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGeoReplication ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : geoReplicationError ? (
              <div className="text-center py-4 text-red-500">
                Error loading geographic replication data
              </div>
            ) : (
              <div className="space-y-4">
                {(!geoReplicationData?.regions || geoReplicationData.regions.length === 0) ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No geographic regions configured
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {geoReplicationData.regions.map((region, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{region.name}</div>
                          {region.status && (
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(region.status)}`}></div>
                              <span className="text-sm">{region.status}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{region.description}</div>
                        {region.type && (
                          <Badge variant="outline" className="mt-2">
                            {region.type}
                          </Badge>
                        )}
                        {region.hostname && (
                          <div className="text-sm mt-2">
                            <span className="text-muted-foreground">Server:</span> {region.hostname}
                          </div>
                        )}
                        {region.type !== 'Local Primary' && (
                          <div className="flex space-x-2 mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateGeoReplicationMutation.mutate({
                                action: 'test',
                                region: region.name
                              })}
                              disabled={updateGeoReplicationMutation.isPending}
                            >
                              Test Connection
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateGeoReplicationMutation.mutate({
                                action: 'replicate'
                              })}
                              disabled={updateGeoReplicationMutation.isPending}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Replicate Now
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {geoReplicationData?.history && geoReplicationData.history.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Recent Synchronization History</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {geoReplicationData.history.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(entry.timestamp)}</TableCell>
                            <TableCell>{entry.region}</TableCell>
                            <TableCell>
                              <Badge variant={entry.status === 'Success' ? 'default' : 'destructive'}>
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{entry.files}</div>
                              <div className="text-sm text-muted-foreground">{entry.duration}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Region</CardTitle>
            <CardDescription>
              Configure a new geographic region for backup replication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...regionForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region Name</label>
                    <Input placeholder="e.g., us-west" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input placeholder="e.g., US West Coast Data Center" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hostname</label>
                    <Input placeholder="e.g., backup-west.example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Backup Directory</label>
                    <Input placeholder="e.g., /app/backups" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SSH User</label>
                    <Input placeholder="e.g., backup" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SSH Port</label>
                    <Input placeholder="22" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SSH Key Path</label>
                  <Input placeholder="e.g., /root/.ssh/id_rsa" />
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => {
                const formData = regionForm.getValues();
                updateGeoReplicationMutation.mutate({
                  action: 'add-region',
                  region: {
                    name: formData.name,
                    hostname: formData.hostname,
                    directory: formData.directory,
                    user: formData.user,
                    keyPath: formData.keyPath,
                    port: formData.port
                  }
                });
              }}
              disabled={updateGeoReplicationMutation.isPending}
            >
              {updateGeoReplicationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Region
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
          <p className="text-muted-foreground mt-1">
            Advanced backup system with monitoring, scheduling, and geo-replication
          </p>
        </div>
        <Button onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="storage">Storage Analysis</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="geo-replication">Geo-Replication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderStatusOverview()}
        </TabsContent>

        <TabsContent value="backups">
          {renderBackupsTab()}
        </TabsContent>
        
        <TabsContent value="storage">
          {renderStorageAnalysisTab()}
        </TabsContent>

        <TabsContent value="logs">
          {renderLogsTab()}
        </TabsContent>

        <TabsContent value="servers">
          {renderServersTab()}
        </TabsContent>

        <TabsContent value="notifications">
          {renderNotificationsTab()}
        </TabsContent>

        <TabsContent value="schedule">
          {renderScheduleTab()}
        </TabsContent>

        <TabsContent value="geo-replication">
          {renderGeoReplicationTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}