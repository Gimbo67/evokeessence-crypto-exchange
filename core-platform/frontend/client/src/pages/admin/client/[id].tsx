import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useTranslations } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Eye, Activity, AlertCircle, Clock, ChevronRight, ExternalLink, Wallet, Send, Download, RefreshCw, Shield, ShieldOff, FileDown, Trash2, Loader2, ClipboardList, X, Check, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { useUserDeletion } from "@/hooks/use-user-deletion";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../layout";
import { getStatusColor } from "@/lib/utils";
import { post } from "@/lib/api-client";
import { GenerateStatementButton } from "@/components/admin/GenerateStatementButton";

// Props interface
interface AdminClientDetailProps {
  id: string;
}

interface ProfileUpdateRequest {
  id: number;
  userId: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  adminComment?: string | null;
  // Fields that can be updated
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  countryOfResidence?: string | null;
  gender?: string | null;
}

interface Client {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string;
  fullName?: string;
  address?: string;
  countryOfResidence?: string;
  gender?: string;
  password?: string;
  kycStatus?: string;
  kyc_status?: string;
  createdAt: string;
  lastLoginAt?: string;
  balance: number;
  balanceCurrency?: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string;
  transactions: Transaction[];
  recentActivity: Activity[];
  profileUpdateRequests?: ProfileUpdateRequest[];
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  txHash?: string;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt: string;
}

export default function ClientDetailPage({ id: propId }: AdminClientDetailProps) {
  const params = useParams();
  // Use prop ID if provided, otherwise use the ID from URL params
  const id = propId || params?.id;

  console.log("Rendering ClientDetailPage for id:", id);

  const [, navigate] = useLocation();
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exportUserData, deleteUser, isExporting, isDeleting } = useUserDeletion();

  // Function to format the profile update request count for display in the UI
  const formatRequestCount = (requests: ProfileUpdateRequest[] | undefined): string => {
    if (!requests || requests.length === 0) {
      return t('no_profile_update_requests');
    }
    
    const pendingCount = requests.filter(req => req.status === 'pending').length;
    
    if (pendingCount > 0) {
      return t('pending_profile_update_count', { count: pendingCount });
    }
    
    return t('total_requests', { count: requests.length });
  };

  const { data: client, isLoading, error, refetch } = useQuery<Client>({
    queryKey: [`/api/admin/clients/${id}`],
    queryFn: async () => {
      console.log("Fetching client data for id:", id);
      try {
        const response = await fetch(`/api/admin/clients/${id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        
        // Log response details for debugging
        console.log("Client details response:", {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('Content-Type'),
          cacheControl: response.headers.get('Cache-Control')
        });
        
        // Special handling for authentication errors
        if (response.status === 401) {
          console.error("Authentication required for client details");
          
          // Redirect to login
          setTimeout(() => {
            window.location.href = '/login?redirect=/admin/clients/' + id;
          }, 1000);
          
          throw new Error('Authentication required. Redirecting to login...');
        }
        
        if (!response.ok) {
          console.error(`Failed to fetch client details: ${response.status} ${response.statusText}`);
          
          // Try to extract error details from the response
          let errorMessage = 'Failed to fetch client details';
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
            if (errorData.details) {
              errorMessage += ': ' + errorData.details;
            }
          } catch (parseError) {
            console.error('Could not parse error details:', parseError);
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log("Received client data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching client data:", error);
        throw error;
      }
    },
    enabled: !!id,
    // Reduce stale time to refresh data more frequently
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
    retryDelay: 1000
  });
  
  // Fetch profile update requests separately 
  const { 
    data: profileRequests, 
    isLoading: isLoadingProfileRequests,
    error: profileRequestsError,
    refetch: refetchProfileRequests 
  } = useQuery({
    queryKey: [`/bypass/profile-updates/user/${id}`],
    queryFn: async () => {
      console.log("Fetching profile update requests for client:", id);
      try {
        // Log request details
        console.log(`Making API request to bypass route: /bypass/profile-updates/user/${id}`);
        
        const response = await fetch(`/bypass/profile-updates/user/${id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error("Failed to fetch profile update requests:", response.status, response.statusText);
          throw new Error("Failed to fetch profile update requests");
        }
        
        const data = await response.json();
        console.log("Profile update requests response:", data);
        
        if (data && data.updates) {
          // If the response has an 'updates' property
          return data.updates;
        } else if (Array.isArray(data)) {
          // If the response is directly an array
          return data;
        } else {
          console.log("No profile update requests found");
          return [];
        }
      } catch (error) {
        console.error("Error fetching profile update requests:", error);
        return []; // Return empty array instead of throwing to prevent UI errors
      }
    },
    enabled: !!id,
    staleTime: 30000,
    retry: 1
  });

  const updateKycStatus = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/admin/clients/${id}/kyc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Failed to update KYC status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${id}`] });
      toast({
        title: t('success'),
        description: t('kyc_status_updated_success')
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('kyc_status_update_failed')
      });
    }
  });
  
  // Add mutation for handling profile update requests
  const reviewProfileUpdate = useMutation({
    mutationFn: async ({ 
      requestId, 
      action, 
      comment,
      selectedFields 
    }: { 
      requestId: number; 
      action: 'approve' | 'reject'; 
      comment?: string;
      selectedFields?: Record<string, boolean>; 
    }) => {
      console.log('Reviewing profile update request:', { requestId, action, comment, selectedFields });
      
      // Prepare request body with field selections if available
      const requestBody: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        adminComment: comment
      };

      // Add selected fields to the request body if provided
      if (action === 'approve' && selectedFields) {
        // Send the selectedFields object directly as expected by the backend
        requestBody.selectedFields = selectedFields;
        console.log('Sending selected fields for approval:', selectedFields);
      }
      
      const response = await fetch(`/bypass/profile-updates/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        console.error('Failed to update profile request:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error(`Failed to ${action} profile update request: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Profile update response:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate both client data and profile request queries
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/bypass/profile-updates/user/${id}`] });
      // Refetch both data sets
      refetch();
      refetchProfileRequests();
      
      toast({
        title: t('success'),
        description: t('profile_update_reviewed_success')
      });
    },
    onError: (error) => {
      console.error('Error reviewing profile update:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || t('profile_update_review_failed')
      });
    }
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Special handling for cryptocurrency currencies that aren't supported by Intl.NumberFormat
    if (currency === 'USDC' || currency === 'USDT' || currency === 'SOL' ||
        !['USD', 'EUR', 'GBP', 'CHF'].includes(currency)) {
      // Format as a number with 2 decimal places and append the currency code
      return `${amount.toFixed(2)} ${currency}`;
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error(`Error formatting currency ${currency}:`, error);
      // Fallback if formatter fails
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <Download className="h-4 w-4" />;
      case 'withdrawal':
        return <Send className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  // Function to manually refresh client data
  const handleRefresh = () => {
    refetch();
    toast({
      title: t('refreshing'),
      description: t('refreshing_client_data')
    });
  };

  const panels = [{
    id: 'client-detail',
    title: t('client_details'),
    defaultSize: 100,
    content: (
      <div className="container py-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              className="gap-2 hover:bg-accent/10"
              onClick={() => navigate('/admin/clients')}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('back_to_clients')}
            </Button>
            <Button
              variant="outline"
              className="gap-2 hover:bg-accent/10 ml-auto"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              {t('refresh')}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('admin_clients')}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {client?.username || id}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse bg-accent/10 rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive">{t('error_loading_client')}</p>
            </CardContent>
          </Card>
        ) : client ? (
          <div className="space-y-6">
            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <CardHeader>
                <CardTitle>{t('client_information')}</CardTitle>
                <CardDescription>{t('client_details_description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('username')}
                    </h3>
                    <p className="text-lg font-medium">{client.username}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('email')}
                    </h3>
                    <p className="text-lg">{client.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('full_name')}
                    </h3>
                    <p className="text-lg">{client.fullName || t('not_provided')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('phone')}
                    </h3>
                    <p className="text-lg">{client.phoneNumber || t('not_provided')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('address')}
                    </h3>
                    <p className="text-lg">{client.address || t('not_provided')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('country')}
                    </h3>
                    <p className="text-lg">{client.countryOfResidence || t('not_provided')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('gender')}
                    </h3>
                    <p className="text-lg">{client.gender || t('not_provided')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('password')} (Hashed)
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs overflow-hidden text-ellipsis max-w-[300px]">{client.password || t('not_provided')}</p>
                      {client.password && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6"
                          onClick={() => {
                            navigator.clipboard.writeText(client.password);
                            toast({
                              title: t('success'),
                              description: t('password_copied')
                            });
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> {t('copy')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('kyc_status')}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(client.kycStatus || client.kyc_status || '')} className="capitalize">
                        {(client.kycStatus || client.kyc_status || '').toLowerCase().replace('_', ' ')}
                      </Badge>
                      <Select
                        defaultValue={client.kycStatus}
                        onValueChange={(value) => updateKycStatus.mutate(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder={t('select_status')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">{t('kyc_not_started')}</SelectItem>
                          <SelectItem value="pending">{t('kyc_pending')}</SelectItem>
                          <SelectItem value="in_progress">{t('kyc_in_progress')}</SelectItem>
                          <SelectItem value="approved">{t('kyc_approved')}</SelectItem>
                          <SelectItem value="rejected">{t('kyc_rejected')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('registration_date')}
                    </h3>
                    <p className="text-lg">{formatDate(client.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('last_login')}
                    </h3>
                    <p className="text-lg">
                      {client.lastLoginAt ? formatDate(client.lastLoginAt) : t('never')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('balance')}
                    </h3>
                    <p className="text-lg font-medium">
                      {formatCurrency(parseFloat(client.balance.toString()), client.balanceCurrency || 'EUR')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('two_factor_authentication')}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={client.twoFactorEnabled ? "success" : "default"} className="capitalize">
                        {client.twoFactorEnabled ? t('enabled') : t('disabled')}
                      </Badge>
                      {client.twoFactorEnabled && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={async () => {
                            if (confirm(t('confirm_disable_2fa'))) {
                              try {
                                const response = await fetch(`/api/admin/2fa/disable/${client.id}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include'
                                });
                                
                                if (!response.ok) {
                                  throw new Error('Failed to disable 2FA');
                                }
                                
                                // Invalidate both the client list and the specific client detail queries
                                queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${id}`] });
                                queryClient.invalidateQueries({ queryKey: [`/api/admin/client/${id}`] });
                                
                                // Force refetch the client data to update the UI
                                refetch();
                                
                                toast({
                                  title: t('success'),
                                  description: t('2fa_disabled_success')
                                });
                              } catch (error) {
                                console.error('Error disabling 2FA:', error);
                                toast({
                                  variant: 'destructive',
                                  title: t('error'),
                                  description: t('2fa_disable_failed')
                                });
                              }
                            }
                          }}
                        >
                          {t('disable_2fa')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6 pt-6 border-t border-border/40">
                  <Button className="gap-2 bg-primary/10 hover:bg-primary/20" onClick={() => navigate(`/admin/clients/${id}/kyc`)}>
                    <Eye className="h-4 w-4" />
                    {t('view_kyc_documents')}
                  </Button>
                  <Button variant="outline" className="gap-2 hover:bg-accent/10" onClick={() => navigate(`/admin/clients/${id}/activity`)}>
                    <Activity className="h-4 w-4" />
                    {t('view_activity_log')}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="gap-2 hover:bg-primary/10" 
                    onClick={() => {
                      // Scroll to profile updates section
                      document.getElementById('profile-updates-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <ClipboardList className="h-4 w-4" />
                    {t('profile_update_requests')}
                    {profileRequests && profileRequests.filter(request => request.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {profileRequests.filter(request => request.status === 'pending').length}
                      </Badge>
                    )}
                  </Button>
                  

                  <div className="ml-auto flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="gap-2 border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
                          disabled={isExporting}
                        >
                          <FileDown className="h-4 w-4" />
                          {isExporting ? t('exporting_data') : t('export_user_data')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('export_user_data_title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('export_user_data_description')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => exportUserData(client.id)}
                            disabled={isExporting}
                          >
                            {isExporting ? 
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                              <FileDown className="mr-2 h-4 w-4" />}
                            {t('confirm_export')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    {/* Generate Bank Statement Button */}
                    <GenerateStatementButton 
                      userId={client.id}
                      userData={client}
                      transactions={client.transactions}
                      className="border-green-500/20 text-green-600 hover:bg-green-500/10"
                    />
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="gap-2"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('delete_user')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('delete_user_title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('delete_user_warning')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteUser(client.id)}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? 
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                              <Trash2 className="mr-2 h-4 w-4" />}
                            {t('confirm_delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Update Requests Section */}
            <Card 
              className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
              id="profile-updates-section"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('profile_update_requests') || 'Profile Update Requests'}</CardTitle>
                    <CardDescription>
                      {t('profile_update_requests_description') || 'Review and manage profile update requests from this client'}
                    </CardDescription>
                  </div>
                  {!isLoadingProfileRequests && profileRequests && profileRequests.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {profileRequests.filter(request => request.status === 'pending').length} pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingProfileRequests ? (
                  <div className="space-y-4">
                    <div className="h-24 animate-pulse bg-accent/10 rounded-lg" />
                    <div className="h-24 animate-pulse bg-accent/10 rounded-lg" />
                  </div>
                ) : profileRequestsError ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-destructive">Error loading profile update requests</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => refetchProfileRequests()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> 
                      Retry
                    </Button>
                  </div>
                ) : profileRequests && profileRequests.length > 0 ? (
                  <div className="space-y-4">
                    <Tabs defaultValue="pending" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-background/95">
                        <TabsTrigger value="pending" className="data-[state=active]:bg-primary/10">
                          Pending 
                          {profileRequests.filter(r => r.status === 'pending').length > 0 && (
                            <Badge variant="outline" className="ml-2">
                              {profileRequests.filter(r => r.status === 'pending').length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="data-[state=active]:bg-primary/10">
                          Approved
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="data-[state=active]:bg-primary/10">
                          Rejected
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="pending" className="space-y-4 mt-4">
                        {profileRequests.filter(r => r.status === 'pending').length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <ClipboardCheck className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                            <p>No pending profile update requests</p>
                          </div>
                        ) : (
                          profileRequests
                            .filter(r => r.status === 'pending')
                            .map(request => (
                              <ProfileUpdateRequestCard 
                                key={request.id}
                                request={request}
                                client={client}
                                onApprove={(requestId, selectedFields) => handleApprove(requestId, selectedFields)}
                                onReject={(requestId, comment) => handleReject(requestId, comment)}
                                isPending={request.status === 'pending'}
                              />
                            ))
                        )}
                      </TabsContent>
                      
                      <TabsContent value="approved" className="space-y-4 mt-4">
                        {profileRequests.filter(r => r.status === 'approved').length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                            <p>No approved profile update requests</p>
                          </div>
                        ) : (
                          profileRequests
                            .filter(r => r.status === 'approved')
                            .map(request => (
                              <ProfileUpdateRequestCard 
                                key={request.id}
                                request={request}
                                client={client}
                                isPending={request.status === 'pending'}
                              />
                            ))
                        )}
                      </TabsContent>
                      
                      <TabsContent value="rejected" className="space-y-4 mt-4">
                        {profileRequests.filter(r => r.status === 'rejected').length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <XCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                            <p>No rejected profile update requests</p>
                          </div>
                        ) : (
                          profileRequests
                            .filter(r => r.status === 'rejected')
                            .map(request => (
                              <ProfileUpdateRequestCard 
                                key={request.id}
                                request={request}
                                client={client}
                                isPending={request.status === 'pending'}
                              />
                            ))
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                    <p>No profile update requests found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <CardHeader>
                <CardTitle>{t('recent_transactions')}</CardTitle>
                <CardDescription>{t('recent_transactions_description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="all" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 lg:w-[400px] bg-background/95">
                    <TabsTrigger value="all" className="data-[state=active]:bg-primary/10">{t('all')}</TabsTrigger>
                    <TabsTrigger value="deposits" className="data-[state=active]:bg-primary/10">{t('deposits')}</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary/10">{t('withdrawals')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4">
                    {client.transactions && client.transactions.length > 0 ? (
                      <div className="space-y-4">
                        {client.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-background border border-border/40 flex items-center justify-center">
                                {getTransactionIcon(transaction.type)}
                              </div>
                              <div className="space-y-1">
                                <p className="font-medium capitalize">
                                  {transaction.type.toLowerCase()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </p>
                              <Badge variant={getStatusColor(transaction.status)} className="mt-1 capitalize">
                                {transaction.status.toLowerCase()}
                              </Badge>
                              {transaction.txHash && (
                                <div className="flex items-center gap-1 mt-1">
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {transaction.txHash}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        {t('no_transactions')}
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="deposits" className="space-y-4">
                    {client.transactions && client.transactions
                      .filter(t => t.type.toLowerCase() === 'deposit')
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-background border border-border/40 flex items-center justify-center">
                              <Download className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium capitalize">
                                {transaction.type.toLowerCase()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <Badge variant={getStatusColor(transaction.status)} className="mt-1 capitalize">
                              {transaction.status.toLowerCase()}
                            </Badge>
                            {transaction.txHash && (
                              <div className="flex items-center gap-1 mt-1">
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground font-mono">
                                  {transaction.txHash}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </TabsContent>

                  <TabsContent value="withdrawals" className="space-y-4">
                    {client.transactions && client.transactions
                      .filter(t => t.type.toLowerCase() === 'withdrawal')
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-background border border-border/40 flex items-center justify-center">
                              <Send className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium capitalize">
                                {transaction.type.toLowerCase()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                            <Badge variant={getStatusColor(transaction.status)} className="mt-1 capitalize">
                              {transaction.status.toLowerCase()}
                            </Badge>
                            {transaction.txHash && (
                              <div className="flex items-center gap-1 mt-1">
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground font-mono">
                                  {transaction.txHash}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* The Profile Update Requests Section has been consolidated into a single implementation above */}
      </div>
    ),
  }];

  // Using the single reviewProfileUpdate mutation defined above

  const handleApprove = (requestId: number, selectedFields?: Record<string, boolean>) => {
    reviewProfileUpdate.mutate({ 
      requestId, 
      action: 'approve',
      selectedFields 
    });
  };

  const handleReject = (requestId: number, comment?: string) => {
    reviewProfileUpdate.mutate({ 
      requestId, 
      action: 'reject',
      comment
    });
  };


  return <AdminLayout panels={panels} />;
}

// Profile Update Request Card Component
interface ProfileUpdateRequestCardProps {
  request: ProfileUpdateRequest;
  client?: Client;  // Add client data to provide current values
  onApprove?: (requestId: number, selectedFields?: Record<string, boolean>) => void;
  onReject?: (requestId: number, comment?: string) => void;
  isPending: boolean;
}

function ProfileUpdateRequestCard({ request, client, onApprove, onReject, isPending }: ProfileUpdateRequestCardProps) {
  const t = useTranslations();
  const [comment, setComment] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  // Format the date for display
  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Helper function to display field changes
  const getFieldChange = (fieldName: string, currentValue: string | null | undefined, requestedValue: string | null | undefined) => {
    // Skip if no change or if requested value is not present
    if (requestedValue === undefined || requestedValue === null) {
      return null;
    }
    
    return (
      <div className="flex flex-col space-y-1 mb-3">
        <span className="text-sm font-medium">{t(fieldName)}</span>
        <div className="flex items-center gap-2">
          <div className="bg-red-100 dark:bg-red-950/30 px-2 py-1 rounded text-sm line-through">
            {currentValue || t('not_set')}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div className="bg-green-100 dark:bg-green-950/30 px-2 py-1 rounded text-sm font-medium">
            {requestedValue || t('not_set')}
          </div>
        </div>
      </div>
    );
  };
  
  // Get current field values from client data
  const currentValues = {
    fullName: client?.fullName || null,
    email: client?.email || null,
    phoneNumber: client?.phoneNumber || null,
    address: client?.address || null,
    countryOfResidence: client?.countryOfResidence || null,
    gender: client?.gender || null
  };
  
  // Get the status badge color
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };
  
  // State for tracking which fields should be approved
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    fullName: request.fullName !== undefined && request.fullName !== null,
    email: request.email !== undefined && request.email !== null, 
    phoneNumber: request.phoneNumber !== undefined && request.phoneNumber !== null,
    address: request.address !== undefined && request.address !== null,
    countryOfResidence: request.countryOfResidence !== undefined && request.countryOfResidence !== null,
    gender: request.gender !== undefined && request.gender !== null
  });
  
  // Count how many fields have changed in this request
  const changedFieldsCount = Object.values(selectedFields).filter(Boolean).length;
  
  // Count how many fields are selected for approval
  const selectedFieldsCount = Object.values(selectedFields).filter(Boolean).length;
  
  // Toggle field selection
  const toggleField = (field: string) => {
    if (!isPending) return; // Don't allow toggling if not pending
    
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  // Check if a field is selected
  const isFieldSelected = (field: string) => selectedFields[field];
  
  return (
    <div className="border border-border/40 rounded-lg p-4 space-y-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('requested_on')} {formattedDate}
          </span>
          {request.reviewedAt && (
            <>
              <span className="text-sm text-muted-foreground mx-2">•</span>
              <span className="text-sm text-muted-foreground">
                {t('reviewed_on')} {new Date(request.reviewedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={
            request.status === 'pending' ? 'default' :
            request.status === 'approved' ? 'success' : 'destructive'
          }>
            {request.status}
          </Badge>
          {changedFieldsCount > 0 && (
            <Badge variant="outline" className="bg-background/50">
              {changedFieldsCount} {changedFieldsCount === 1 ? t('field') : t('fields')}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2 bg-accent/5 rounded-md">
        <div>
          <h4 className="font-medium mb-2">{t('requested_changes')}</h4>
          <div className="space-y-3">
            {/* Full Name updates */}
            {request.fullName !== undefined && request.fullName !== null && (
              <div className="flex flex-col gap-1 pb-2 border-b border-border/20">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('full_name')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-fullName-${request.id}`}
                        checked={isFieldSelected('fullName')}
                        onCheckedChange={() => toggleField('fullName')}
                      />
                      <Label htmlFor={`approve-fullName-${request.id}`} className="text-xs">
                        {isFieldSelected('fullName') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.fullName || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.fullName || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email updates */}
            {request.email !== undefined && request.email !== null && (
              <div className="flex flex-col gap-1 pb-2 border-b border-border/20">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('email')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-email-${request.id}`}
                        checked={isFieldSelected('email')}
                        onCheckedChange={() => toggleField('email')}
                      />
                      <Label htmlFor={`approve-email-${request.id}`} className="text-xs">
                        {isFieldSelected('email') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.email || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.email || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Phone Number updates */}
            {request.phoneNumber !== undefined && request.phoneNumber !== null && (
              <div className="flex flex-col gap-1 pb-2 border-b border-border/20">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('phone')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-phoneNumber-${request.id}`}
                        checked={isFieldSelected('phoneNumber')}
                        onCheckedChange={() => toggleField('phoneNumber')}
                      />
                      <Label htmlFor={`approve-phoneNumber-${request.id}`} className="text-xs">
                        {isFieldSelected('phoneNumber') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.phoneNumber || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.phoneNumber || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Address updates */}
            {request.address !== undefined && request.address !== null && (
              <div className="flex flex-col gap-1 pb-2 border-b border-border/20">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('address')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-address-${request.id}`}
                        checked={isFieldSelected('address')}
                        onCheckedChange={() => toggleField('address')}
                      />
                      <Label htmlFor={`approve-address-${request.id}`} className="text-xs">
                        {isFieldSelected('address') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.address || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.address || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Country updates */}
            {request.countryOfResidence !== undefined && request.countryOfResidence !== null && (
              <div className="flex flex-col gap-1 pb-2 border-b border-border/20">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('country')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-countryOfResidence-${request.id}`}
                        checked={isFieldSelected('countryOfResidence')}
                        onCheckedChange={() => toggleField('countryOfResidence')}
                      />
                      <Label htmlFor={`approve-countryOfResidence-${request.id}`} className="text-xs">
                        {isFieldSelected('countryOfResidence') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.countryOfResidence || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.countryOfResidence || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Gender updates */}
            {request.gender !== undefined && request.gender !== null && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <h5 className="text-sm font-medium">{t('gender')}</h5>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`approve-gender-${request.id}`}
                        checked={isFieldSelected('gender')}
                        onCheckedChange={() => toggleField('gender')}
                      />
                      <Label htmlFor={`approve-gender-${request.id}`} className="text-xs">
                        {isFieldSelected('gender') ? t('approve') : t('excluded')}
                      </Label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('current_value')}:</p>
                    <p className="text-sm">{client?.gender || t('not_provided')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('requested_value')}:</p>
                    <p className="text-sm font-medium">{request.gender || t('not_provided')}</p>
                  </div>
                </div>
              </div>
            )}

            {changedFieldsCount === 0 && (
              <p className="text-sm text-muted-foreground italic">{t('no_changes_requested')}</p>
            )}
          </div>
        </div>
        
        {!isPending ? (
          <div className="space-y-2">
            <h4 className="font-medium mb-1">{t('admin_review')}</h4>
            {request.adminComment ? (
              <p className="text-sm">{request.adminComment}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('no_comments_provided')}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-end justify-between h-full">
            <div className="text-xs text-muted-foreground mb-auto">
              {selectedFieldsCount > 0 ? (
                <p>
                  {selectedFieldsCount} {selectedFieldsCount === 1 ? t('field') : t('fields')} {t('selected_for_approval')}
                </p>
              ) : (
                <p className="text-amber-500">{t('no_fields_selected')}</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowRejectDialog(true)}
              >
                {t('reject')}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-success hover:bg-success/10"
                disabled={selectedFieldsCount === 0}
                onClick={() => onApprove && onApprove(request.id, selectedFields)}
              >
                {t('approve_selected')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Profile Update</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this profile update. This will be visible to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <Label htmlFor="reject-comment">Comment</Label>
            <Textarea 
              id="reject-comment"
              placeholder="Reason for rejection"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (onReject) {
                  onReject(request.id, comment);
                  setComment('');
                  setShowRejectDialog(false);
                }
              }}
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}