import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";
import AdminLayout from '../admin/layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';

// Types for security dashboard data
interface SecurityLog {
  message: string;
  timestamp: string;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high';
}

interface BannedIP {
  ipAddress: string;
  timestamp: number;
  reason?: string;
}

interface SecurityStats {
  totalAttempts: number;
  bannedIPs: number;
  loginFailures: number;
  captchaShown: number;
  suspiciousActivities: number;
  lastUpdated: string;
}

// IP ban form schema
const banIPSchema = z.object({
  ipAddress: z.string().min(7, "Please enter a valid IP address"),
  reason: z.string().optional()
});

const SecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const queryClient = useQueryClient();

  // Fetch security dashboard data
  const { data: securityData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['/api/admin/security/dashboard'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/security/dashboard');
      return response.data;
    }
  });

  // Fetch banned IPs
  const { data: bannedIPs, isLoading: loadingBannedIPs } = useQuery({
    queryKey: ['/api/admin/security/banned-ips'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/security/banned-ips');
      return response.data.bannedIPs || [];
    }
  });

  // Fetch security logs
  const { data: securityLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['/api/admin/security/logs'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/security/logs');
      return response.data.logs || [];
    }
  });

  // Fetch security statistics
  const { data: securityStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/admin/security/stats'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/security/stats');
      return response.data;
    }
  });

  // Mutation for unbanning an IP
  const unbanIPMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const response = await axios.post('/api/admin/security/unban', { ipAddress });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "IP Unbanned",
        description: "The IP address has been successfully unbanned.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/banned-ips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unban IP address. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Manual IP ban functionality
  const form = useForm<z.infer<typeof banIPSchema>>({
    resolver: zodResolver(banIPSchema),
    defaultValues: {
      ipAddress: "",
      reason: ""
    }
  });

  const banIPMutation = useMutation({
    mutationFn: async (values: z.infer<typeof banIPSchema>) => {
      const response = await axios.post('/api/admin/security/manual-ban', values);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "IP Banned",
        description: "The IP address has been successfully banned.",
        variant: "default",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/banned-ips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/security/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to ban IP address. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof banIPSchema>) => {
    banIPMutation.mutate(values);
  };

  const handleUnban = (ipAddress: string) => {
    if (window.confirm(`Are you sure you want to unban ${ipAddress}?`)) {
      unbanIPMutation.mutate(ipAddress);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const panels = [{
    id: 'security',
    title: "Security Dashboard",
    defaultSize: 100,
    content: (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Security Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="dashboard">Overview</TabsTrigger>
            <TabsTrigger value="logs">Security Logs</TabsTrigger>
            <TabsTrigger value="banned">Banned IPs</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="dashboard">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                    Security Overview
                  </CardTitle>
                  <CardDescription>
                    Current security status and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ) : securityStats ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Attempts:</span>
                        <span className="font-medium">{securityStats.totalAttempts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Banned IPs:</span>
                        <span className="font-medium">{securityStats.bannedIPs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Login Failures:</span>
                        <span className="font-medium">{securityStats.loginFailures}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CAPTCHA Shown:</span>
                        <span className="font-medium">{securityStats.captchaShown}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Suspicious Activities:</span>
                        <span className="font-medium">{securityStats.suspiciousActivities}</span>
                      </div>
                      <div className="pt-2 text-xs text-muted-foreground">
                        Last updated: {securityStats.lastUpdated ? new Date(securityStats.lastUpdated).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No statistics available</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                    Recent Incidents
                  </CardTitle>
                  <CardDescription>
                    Latest security incidents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingLogs ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ) : securityLogs && securityLogs.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {securityLogs.slice(0, 5).map((log: SecurityLog, index: number) => (
                          <div key={index} className="border-b pb-2 last:border-0">
                            <div className="flex justify-between items-start">
                              <div className="text-sm">{log.message}</div>
                              {getSeverityBadge(log.severity)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-sm text-muted-foreground">No recent incidents</div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                    Banned IP Addresses
                  </CardTitle>
                  <CardDescription>
                    Recent IP bans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingBannedIPs ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ) : bannedIPs && bannedIPs.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {bannedIPs.slice(0, 5).map((ip: BannedIP, index: number) => (
                          <div key={index} className="border-b pb-2 last:border-0">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{ip.ipAddress}</div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUnban(ip.ipAddress)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Banned {formatDistanceToNow(new Date(ip.timestamp), { addSuffix: true })}
                              {ip.reason && <span> - {ip.reason}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-sm text-muted-foreground">No banned IP addresses</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Security Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Security Logs</CardTitle>
                <CardDescription>
                  Detailed security events and incidents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableCaption>A list of recent security logs</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securityLogs && securityLogs.length > 0 ? (
                          securityLogs.map((log: SecurityLog, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>{log.message}</TableCell>
                              <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                              <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">No security logs available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Banned IPs Tab */}
          <TabsContent value="banned">
            <Card>
              <CardHeader>
                <CardTitle>Banned IP Addresses</CardTitle>
                <CardDescription>
                  IP addresses that have been banned due to suspicious activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBannedIPs ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableCaption>A list of banned IP addresses</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Ban Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bannedIPs && bannedIPs.length > 0 ? (
                        bannedIPs.map((ip: BannedIP, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{ip.ipAddress}</TableCell>
                            <TableCell>{new Date(ip.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{ip.reason || 'Automatic ban (suspicious activity)'}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUnban(ip.ipAddress)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Unban this IP address</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No banned IP addresses</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Actions Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Security Actions</CardTitle>
                <CardDescription>
                  Manual security controls and actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Ban IP Address</h3>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="ipAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IP Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter IP address to ban" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Reason for ban" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          disabled={banIPMutation.isPending}
                        >
                          {banIPMutation.isPending ? "Banning..." : "Ban IP Address"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-3">Security Documentation</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Our security implementation includes the following features:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                      <li>IP-based abuse detection system</li>
                      <li>Rate limiting for sensitive operations</li>
                      <li>Two-factor authentication for admin access</li>
                      <li>CAPTCHA for suspicious login attempts</li>
                      <li>Automatic IP banning for brute force attempts</li>
                      <li>Security headers for web protection</li>
                      <li>TLS 1.3 with modern cipher suites</li>
                    </ul>
                    <Button variant="outline" onClick={() => window.open('/security-policy', '_blank')}>
                      View Full Security Documentation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    ),
  }];

  return <AdminLayout panels={panels} />;
};

export default SecurityDashboard;