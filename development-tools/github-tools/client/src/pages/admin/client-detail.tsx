import { useQuery, useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { useTranslations } from '@/lib/language-context';
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { 
  Loader2, Edit2, Save, X, CreditCard, Clock, CheckCircle2, XCircle, 
  Info, ClipboardList, AlertTriangle, RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import axios from "axios";

export interface Transaction {
  id: number | string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'usdt' | 'usdc';
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reference?: string;
  initialAmount?: number;
  commissionAmount?: number;
  totalAmount?: number;
  txHash?: string;
}

export interface ProfileUpdateRequest {
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

export interface Client {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  countryOfResidence: string;
  gender: string;
  userGroup: string;
  kycStatus: string;
  balance: number;
  balanceCurrency: string;
  createdAt: string;
  lastLoginAt: string;
  transactions: Transaction[];
  profileUpdateRequests?: ProfileUpdateRequest[];
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const clientId = id;
  const t = useTranslations();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  // For granular field-level approvals
  const [selectedFields, setSelectedFields] = useState<Record<string, Record<string, boolean>>>({});

  console.log("ClientDetail: Component mounted with clientId:", clientId);

  // Fetch client data
  const { data: client, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/admin/clients/${clientId}`],
    queryFn: async () => {
      console.log("ClientDetail: Fetching data for client:", clientId);
      const response = await axios.get(`/api/admin/clients/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
    staleTime: 30000,
    retry: 1
  });
  
  // Fetch profile update requests
  const { 
    data: profileUpdateRequests, 
    isLoading: isLoadingRequests,
    error: profileUpdatesError,
    refetch: refetchProfileUpdates
  } = useQuery({
    queryKey: [`/bypass/profile-updates/user/${clientId}`],
    queryFn: async () => {
      console.log("Fetching profile update requests for client:", clientId);
      try {
        // Log detailed request information
        console.log(`Making API request to bypass route: /bypass/profile-updates/user/${clientId}`);
        
        const response = await axios.get(`/bypass/profile-updates/user/${clientId}`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log("Profile update response:", response.data);
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);
        
        // Handle different response formats
        if (response.data && response.data.updates) {
          console.log(`Found ${response.data.updates.length} profile update requests in 'updates' property`);
          // Transform the updates to match expected format in the component
          const transformedUpdates = response.data.updates.map((update: any) => {
            console.log("Processing update:", update);
            
            // Create a flattened update object with extracted change values
            const flattenedUpdate: any = {
              id: update.id,
              userId: update.userId,
              status: update.status,
              createdAt: update.createdAt,
              reviewedAt: update.reviewedAt,
              adminComment: update.adminComment
            };
            
            // If the update has a changes object, extract the requested values
            if (update.changes) {
              console.log("Found changes object:", update.changes);
              // For each change field, extract the requested value if it exists
              Object.entries(update.changes).forEach(([key, value]: [string, any]) => {
                console.log(`Processing change field: ${key}`, value);
                if (value && value.requested !== undefined) {
                  flattenedUpdate[key] = value.requested;
                  // Also store the current value for comparison
                  flattenedUpdate[`current_${key}`] = value.current;
                }
              });
            }
            
            console.log("Transformed update:", flattenedUpdate);
            return flattenedUpdate;
          });
          
          console.log("Final transformed updates:", transformedUpdates);
          return transformedUpdates;
        } else if (Array.isArray(response.data)) {
          console.log(`Found ${response.data.length} profile update requests in array format`);
          return response.data;
        } else {
          console.log("No updates found in response, returning empty array");
          return [];
        }
      } catch (error) {
        console.error("Error fetching profile updates:", error);
        // Log more detailed error information
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response: { status: number; data: any } };
          console.error("Error response status:", axiosError.response.status);
          console.error("Error response data:", axiosError.response.data);
        }
        throw error;
      }
    },
    enabled: !!clientId,
    staleTime: 30000,
    retry: 1
  });
  
  // Define a type for review mutation
  type ReviewMutationParams = { 
    requestId: number; 
    action: 'approve' | 'reject'; 
    comment?: string;
    selectedFields?: Record<string, boolean>; // Add fields for granular approval
  };
  
  // Approve or reject profile update request
  const reviewProfileUpdateMutation = useMutation<any, Error, ReviewMutationParams>({
    mutationFn: async ({ requestId, action, comment, selectedFields }: ReviewMutationParams) => {
      console.log(`Processing request ${requestId} with action ${action}`, 
        comment ? `and comment: ${comment}` : "without comment",
        selectedFields ? `with selected fields: ${JSON.stringify(selectedFields)}` : "with all fields"
      );
      
      const payload: any = {
        status: action,
        adminComment: comment
      };
      
      // If we have selectedFields and it's an approval, include them in the request
      if (action === 'approve' && selectedFields) {
        payload.selectedFields = selectedFields;
      }
      
      const response = await axios.patch(`/bypass/profile-updates/${requestId}`, payload, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Profile update request processed successfully:", data);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/bypass/profile-updates/user/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${clientId}`] });
      
      // After processing the request, refresh client data
      refetch();
      refetchProfileUpdates();
      
      // Show success toast with action-specific message
      toast({
        title: data.message || t('update_request_processed'),
        description: data.action === 'approve' 
          ? t('profile_update_request_approved') 
          : t('profile_update_request_rejected'),
        variant: "default",
      });
      
      // Clear comment field after submission
      setAdminComment("");
    },
    onError: (error: unknown) => {
      console.error('Error processing profile update request:', error);
      toast({
        title: t('error'),
        description: t('failed_to_process_profile_update_request'),
        variant: "destructive",
      });
    }
  });

  // Update client profile mutation
  const updateClientMutation = useMutation<any, Error, Partial<Client>>({
    mutationFn: async (updatedData: Partial<Client>) => {
      console.log("Sending profile update with data:", updatedData);
      
      // Use our PATCH endpoint that correctly maps camelCase to snake_case
      const response = await axios.patch(`/api/admin/clients/${clientId}/profile`, {
        fullName: updatedData.fullName,
        email: updatedData.email,
        phoneNumber: updatedData.phoneNumber,
        address: updatedData.address,
        countryOfResidence: updatedData.countryOfResidence,
        gender: updatedData.gender
      }, {
        withCredentials: true, 
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Received response from profile update:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      // Handle the successful response
      console.log("Update successful, received data:", data);
      
      // Manually update the client data with the fresh data received
      if (data && data.user) {
        queryClient.setQueryData([`/api/admin/clients/${clientId}`], 
          (oldData: any) => ({
            ...oldData,
            ...data.user
          })
        );
      }
      
      // Also invalidate the query to ensure we get fresh data on next query
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${clientId}`] });
      
      toast({
        title: t('client_updated'),
        description: t('client_updated_successfully'),
      });
      setIsEditing(false);
    },
    onError: (error: unknown) => {
      console.error('Error updating client profile:', error);
      toast({
        title: t('error'),
        description: t('failed_to_update_client'),
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (client) {
      setEditedClient({
        username: client.username,
        email: client.email,
        fullName: client.fullName,
        phoneNumber: client.phoneNumber,
        address: client.address,
        countryOfResidence: client.countryOfResidence,
        gender: client.gender,
        userGroup: client.userGroup,
        kycStatus: client.kycStatus,
        balance: client.balance
      });
    }
  }, [client]);

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (client) {
      setEditedClient({
        username: client.username,
        email: client.email,
        fullName: client.fullName,
        phoneNumber: client.phoneNumber,
        address: client.address,
        countryOfResidence: client.countryOfResidence,
        gender: client.gender,
        userGroup: client.userGroup,
        kycStatus: client.kycStatus,
        balance: client.balance
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!editedClient) return;

    setIsSubmitting(true);
    try {
      await updateClientMutation.mutateAsync(editedClient);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setEditedClient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBackToList = () => {
    setLocation('/admin/clients');
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
  
  // Helper functions for profile updates
  const handleProcessUpdateRequest = (requestId: number, action: 'approve' | 'reject', selectedFields?: Record<string, boolean>) => {
    reviewProfileUpdateMutation.mutate({
      requestId,
      action,
      comment: adminComment,
      selectedFields: action === 'approve' ? selectedFields : undefined // Only send selected fields for approval
    });
  };
  
  // Helper functions for the new ProfileUpdateRequest interface
  const getRequestFieldName = (request: ProfileUpdateRequest): string => {
    // Check for changes object in our custom expanded format
    const flatRequest = request as any;
    
    // First check for direct properties that aren't null
    if (request.fullName !== undefined && request.fullName !== null) return t('full_name');
    if (request.email !== undefined && request.email !== null) return t('email');
    if (request.phoneNumber !== undefined && request.phoneNumber !== null) return t('phone_number');
    if (request.address !== undefined && request.address !== null) return t('address');
    if (request.countryOfResidence !== undefined && request.countryOfResidence !== null) return t('country_of_residence');
    if (request.gender !== undefined && request.gender !== null) return t('gender');
    
    // Then check for change markers in our transformed format
    if (flatRequest.current_fullName !== undefined) return t('full_name');
    if (flatRequest.current_email !== undefined) return t('email');
    if (flatRequest.current_phoneNumber !== undefined) return t('phone_number');
    if (flatRequest.current_address !== undefined) return t('address');
    if (flatRequest.current_countryOfResidence !== undefined) return t('country_of_residence');
    if (flatRequest.current_gender !== undefined) return t('gender');
    
    return t('unknown_field');
  };
  
  // Function to get current value from client data based on which field is being updated
  const getCurrentValue = (request: ProfileUpdateRequest, client?: Client): string | null => {
    // First check for our stored current_ values from the API response
    if (request.fullName !== undefined && request.fullName !== null) {
      return (request as any).current_fullName ?? client?.fullName ?? null;
    }
    if (request.email !== undefined && request.email !== null) {
      return (request as any).current_email ?? client?.email ?? null;
    }
    if (request.phoneNumber !== undefined && request.phoneNumber !== null) {
      return (request as any).current_phoneNumber ?? client?.phoneNumber ?? null;
    }
    if (request.address !== undefined && request.address !== null) {
      return (request as any).current_address ?? client?.address ?? null;
    }
    if (request.countryOfResidence !== undefined && request.countryOfResidence !== null) {
      return (request as any).current_countryOfResidence ?? client?.countryOfResidence ?? null;
    }
    if (request.gender !== undefined && request.gender !== null) {
      return (request as any).current_gender ?? client?.gender ?? null;
    }
    return null;
  };
  
  // Function to get requested value from the request
  const getRequestedValue = (request: ProfileUpdateRequest): string | null => {
    if (request.fullName !== undefined && request.fullName !== null) return request.fullName;
    if (request.email !== undefined && request.email !== null) return request.email;
    if (request.phoneNumber !== undefined && request.phoneNumber !== null) return request.phoneNumber;
    if (request.address !== undefined && request.address !== null) return request.address;
    if (request.countryOfResidence !== undefined && request.countryOfResidence !== null) return request.countryOfResidence;
    if (request.gender !== undefined && request.gender !== null) return request.gender;
    return null;
  };
  
  // Function to get a list of fields in a request
  const getRequestFields = (request: ProfileUpdateRequest): string[] => {
    const fields: string[] = [];
    
    if (request.fullName !== undefined && request.fullName !== null) fields.push('fullName');
    if (request.email !== undefined && request.email !== null) fields.push('email');
    if (request.phoneNumber !== undefined && request.phoneNumber !== null) fields.push('phoneNumber');
    if (request.address !== undefined && request.address !== null) fields.push('address');
    if (request.countryOfResidence !== undefined && request.countryOfResidence !== null) fields.push('countryOfResidence');
    if (request.gender !== undefined && request.gender !== null) fields.push('gender');
    
    return fields;
  };
  
  // Function to handle field selection toggle
  const handleFieldSelection = (requestId: number, field: string, checked: boolean) => {
    setSelectedFields(prev => {
      // Create a new object to avoid mutating state directly
      const newSelectedFields = { ...prev };
      
      // Initialize the request fields object if it doesn't exist
      if (!newSelectedFields[requestId]) {
        newSelectedFields[requestId] = {};
      }
      
      // Update the field selection
      newSelectedFields[requestId][field] = checked;
      
      return newSelectedFields;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">{t('loading_client_details')}</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen p-6">
        <Card className="p-6 border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">{t('error_loading_client')}</CardTitle>
            <CardDescription>
              {t('failed_to_load_client_details')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackToList} variant="outline">
              {t('back_to_client_list')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive"> = {
      "approved": "default",
      "rejected": "destructive",
      "pending": "secondary",
      "completed": "default",
      "successful": "default",
      "failed": "destructive",
    };

    return (
      <Badge variant={variantMap[status.toLowerCase()] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToList}
          className="mr-4"
        >
          {t('back_to_clients')}
        </Button>
        <h1 className="text-2xl font-bold flex-1">{t('client_details')}</h1>

        <div className="flex space-x-2">
          {/* Profile Update Requests Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('profile-updates-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="mr-2"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  {t('profile_updates')}
                  {profileUpdateRequests && profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('view_profile_update_requests')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isEditing ? (
            <Button onClick={handleStartEditing}>
              <Edit2 className="mr-2 h-4 w-4" />
              {t('edit')}
            </Button>
          ) : (
            <div className="space-x-2">
              <Button onClick={handleCancelEditing} variant="outline">
                <X className="mr-2 h-4 w-4" />
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t('save')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('client_information')}</CardTitle>
            <CardDescription>
              {t('client_list_id')}: {client.id}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">{t('username')}</Label>
                {isEditing ? (
                  <Input 
                    id="username" 
                    value={editedClient?.username || ''} 
                    onChange={(e) => handleChange('username', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.username}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                {isEditing ? (
                  <Input 
                    id="email" 
                    type="email" 
                    value={editedClient?.email || ''} 
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.email}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">{t('full_name')}</Label>
                {isEditing ? (
                  <Input 
                    id="fullName" 
                    value={editedClient?.fullName || ''} 
                    onChange={(e) => handleChange('fullName', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.fullName || t('not_provided')}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t('phone_number')}</Label>
                {isEditing ? (
                  <Input 
                    id="phoneNumber" 
                    value={editedClient?.phoneNumber || ''} 
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.phoneNumber || t('not_provided')}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('address')}</Label>
                {isEditing ? (
                  <Input 
                    id="address" 
                    value={editedClient?.address || ''} 
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.address || t('not_provided')}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="countryOfResidence">{t('country_of_residence')}</Label>
                {isEditing ? (
                  <Input 
                    id="countryOfResidence" 
                    value={editedClient?.countryOfResidence || ''} 
                    onChange={(e) => handleChange('countryOfResidence', e.target.value)}
                  />
                ) : (
                  <div className="p-2 border rounded-md">{client.countryOfResidence || t('not_provided')}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">{t('gender')}</Label>
                {isEditing ? (
                  <Select 
                    value={editedClient?.gender || ''} 
                    onValueChange={(value) => handleChange('gender', value)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder={t('select_gender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('male')}</SelectItem>
                      <SelectItem value="female">{t('female')}</SelectItem>
                      <SelectItem value="other">{t('other')}</SelectItem>
                      <SelectItem value="">{t('prefer_not_to_say')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 border rounded-md capitalize">
                    {client.gender ? t(client.gender) : t('not_provided')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="userGroup">{t('user_group')}</Label>
                {isEditing ? (
                  <Select 
                    value={editedClient?.userGroup || 'standard'} 
                    onValueChange={(value) => handleChange('userGroup', value)}
                  >
                    <SelectTrigger id="userGroup">
                      <SelectValue placeholder={t('select_user_group')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">{t('standard')}</SelectItem>
                      <SelectItem value="premium">{t('premium')}</SelectItem>
                      <SelectItem value="vip">{t('vip')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 border rounded-md capitalize">{client.userGroup || 'standard'}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kycStatus">{t('kyc_status')}</Label>
                {isEditing ? (
                  <Select 
                    value={editedClient?.kycStatus || 'pending'} 
                    onValueChange={(value) => handleChange('kycStatus', value)}
                  >
                    <SelectTrigger id="kycStatus">
                      <SelectValue placeholder={t('select_kyc_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="approved">{t('approved')}</SelectItem>
                      <SelectItem value="rejected">{t('rejected')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 border rounded-md">
                    {getStatusBadge(client.kycStatus || 'pending')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">{t('balance')}</Label>
                {isEditing ? (
                  <Input 
                    id="balance" 
                    type="number" 
                    step="0.01" 
                    value={editedClient?.balance?.toString() || '0.00'} 
                    onChange={(e) => handleChange('balance', parseFloat(e.target.value))}
                  />
                ) : (
                  <div className="p-2 border rounded-md font-medium">
                    {client.balance?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                    {client.balanceCurrency || 'USD'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('account_summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {t('registered')}
                </span>
                <span>{new Date(client.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {t('last_login')}
                </span>
                <span>
                  {client.lastLoginAt 
                    ? new Date(client.lastLoginAt).toLocaleDateString() 
                    : t('never')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('kyc_status')}
                </span>
                <span>
                  {getStatusBadge(client.kycStatus || 'pending')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t('transactions')}
                </span>
                <span>{client.transactions?.length || 0}</span>
              </div>

              <div className="pt-4">
                <h3 className="font-semibold mb-2">{t('quick_actions')}</h3>
                <div className="grid gap-2">
                  <Button variant="outline" size="sm" className="justify-start">
                    {t('view_kyc_documents')}
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start">
                    {t('view_activity_log')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => document.getElementById('profile-updates-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {t('view_profile_update_requests')}
                    {profileUpdateRequests && profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length}
                      </Badge>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start">
                    {t('export_user_data')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Update Requests section */}
      <Card className="mt-6 border-l-4 border-l-orange-400" id="profile-updates-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{t('profile_updates')}</span>
              {profileUpdateRequests && profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length > 0 && (
                <Badge variant="secondary">{profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('profile_update_requests_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRequests ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span>{t('loading_profile_updates')}</span>
              </div>
            ) : profileUpdatesError ? (
              <div className="p-4 text-center text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>{t('error_loading_profile_updates')}</p>
                <Button 
                  onClick={() => refetchProfileUpdates()} 
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('retry')}
                </Button>
              </div>
            ) : !profileUpdateRequests || profileUpdateRequests.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {t('no_profile_updates')}
              </div>
            ) : (
              <div className="space-y-4">
                <Tabs defaultValue="pending">
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending">
                      {t('pending')}
                      {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="approved">{t('approved')}</TabsTrigger>
                    <TabsTrigger value="rejected">{t('rejected')}</TabsTrigger>
                    <TabsTrigger value="all">{t('all')}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pending" className="space-y-4">
                    {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'pending').length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('no_pending_profile_updates')}
                      </div>
                    ) : (
                      profileUpdateRequests
                        .filter((request: ProfileUpdateRequest) => request.status === 'pending')
                        .map((request: ProfileUpdateRequest) => (
                          <motion.div 
                            key={request.id}
                            className="p-4 border rounded-md bg-muted/20"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getRequestFieldName(request)}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(request.createdAt).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('current_value')}</Label>
                                <div className="p-2 border rounded-md bg-background">
                                  {getCurrentValue(request, client) || t('not_provided')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('requested_value')}</Label>
                                <div className="p-2 border rounded-md bg-background font-medium">
                                  {getRequestedValue(request) || t('not_provided')}
                                </div>
                              </div>
                            </div>
                            
                            {/* Field selection checkboxes */}
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">{t('select_fields_to_approve')}</Label>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    // Get all fields from the request
                                    const fields = getRequestFields(request);
                                    // Select all fields
                                    const allSelected = fields.reduce((obj, field) => {
                                      obj[field] = true;
                                      return obj;
                                    }, {} as Record<string, boolean>);
                                    // Update state
                                    setSelectedFields(prev => ({
                                      ...prev,
                                      [request.id]: allSelected
                                    }));
                                  }}
                                >
                                  {t('select_all')}
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                {getRequestFields(request).map(field => (
                                  <div key={field} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={`${request.id}-${field}`}
                                      checked={selectedFields[request.id]?.[field] || false}
                                      onCheckedChange={(checked) => 
                                        handleFieldSelection(request.id, field, checked as boolean)
                                      }
                                    />
                                    <Label 
                                      htmlFor={`${request.id}-${field}`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {t(field.replace(/([A-Z])/g, '_$1').toLowerCase())}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <Label htmlFor={`comment-${request.id}`}>{t('admin_comment')}</Label>
                              <Input
                                id={`comment-${request.id}`}
                                placeholder={t('optional_comment')}
                                value={adminComment}
                                onChange={(e) => setAdminComment(e.target.value)}
                              />
                            </div>
                            
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleProcessUpdateRequest(request.id, 'reject')}
                                disabled={reviewProfileUpdateMutation.status === 'pending'}
                              >
                                {reviewProfileUpdateMutation.status === 'pending' ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4" />
                                )}
                                {t('reject')}
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => {
                                  // Get the selected fields for this request
                                  const requestFields = selectedFields[request.id] || {};
                                  
                                  // Check if any fields are selected
                                  const hasSelectedFields = Object.values(requestFields).some(v => v);

                                  // If no fields explicitly selected, select all fields
                                  if (!hasSelectedFields) {
                                    const fields = getRequestFields(request);
                                    const allFields = fields.reduce((obj, field) => {
                                      obj[field] = true;
                                      return obj;
                                    }, {} as Record<string, boolean>);
                                    
                                    handleProcessUpdateRequest(request.id, 'approve', allFields);
                                  } else {
                                    // Only pass selected fields
                                    handleProcessUpdateRequest(request.id, 'approve', requestFields);
                                  }
                                }}
                                disabled={reviewProfileUpdateMutation.status === 'pending'}
                              >
                                {reviewProfileUpdateMutation.status === 'pending' ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {t('approve')}
                              </Button>
                            </div>
                          </motion.div>
                        ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="approved" className="space-y-4">
                    {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'approved').length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('no_approved_profile_updates')}
                      </div>
                    ) : (
                      profileUpdateRequests
                        .filter((request: ProfileUpdateRequest) => request.status === 'approved')
                        .map((request: ProfileUpdateRequest) => (
                          <div key={request.id} className="p-4 border rounded-md bg-green-50/10 border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getRequestFieldName(request)}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground">
                                  {t('requested')}: {new Date(request.createdAt).toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t('approved')}: {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : t('unknown')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('previous_value')}</Label>
                                <div className="p-2 border rounded-md bg-background">
                                  {getCurrentValue(request, client) || t('not_provided')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('new_value')}</Label>
                                <div className="p-2 border rounded-md bg-background font-medium">
                                  {getRequestedValue(request) || t('not_provided')}
                                </div>
                              </div>
                            </div>
                            
                            {request.adminComment && (
                              <div className="mt-2 p-2 border rounded-md bg-muted/20">
                                <Label className="text-xs text-muted-foreground">{t('admin_comment')}</Label>
                                <p className="text-sm">{request.adminComment}</p>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="rejected" className="space-y-4">
                    {profileUpdateRequests.filter((request: ProfileUpdateRequest) => request.status === 'rejected').length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('no_rejected_profile_updates')}
                      </div>
                    ) : (
                      profileUpdateRequests
                        .filter((request: ProfileUpdateRequest) => request.status === 'rejected')
                        .map((request: ProfileUpdateRequest) => (
                          <div key={request.id} className="p-4 border rounded-md bg-destructive/5 border-destructive/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getRequestFieldName(request)}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground">
                                  {t('requested')}: {new Date(request.createdAt).toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {t('rejected')}: {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : t('unknown')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('current_value')}</Label>
                                <div className="p-2 border rounded-md bg-background">
                                  {getCurrentValue(request, client) || t('not_provided')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('rejected_value')}</Label>
                                <div className="p-2 border rounded-md bg-background line-through">
                                  {getRequestedValue(request) || t('not_provided')}
                                </div>
                              </div>
                            </div>
                            
                            {request.adminComment && (
                              <div className="mt-2 p-2 border rounded-md bg-muted/20">
                                <Label className="text-xs text-muted-foreground">{t('rejection_reason')}</Label>
                                <p className="text-sm">{request.adminComment}</p>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="all" className="space-y-4">
                    {profileUpdateRequests.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {t('no_profile_updates')}
                      </div>
                    ) : (
                      profileUpdateRequests
                        .sort((a: ProfileUpdateRequest, b: ProfileUpdateRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((request: ProfileUpdateRequest) => (
                          <div 
                            key={request.id} 
                            className={`p-4 border rounded-md ${
                              request.status === 'pending' ? 'bg-muted/20' : 
                              request.status === 'approved' ? 'bg-green-50/10 border-green-200' : 
                              'bg-destructive/5 border-destructive/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getRequestFieldName(request)}</span>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-muted-foreground">
                                  {t('requested')}: {new Date(request.createdAt).toLocaleString()}
                                </span>
                                {request.reviewedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {request.status === 'approved' ? t('approved') : t('rejected')}: 
                                    {' '}{new Date(request.reviewedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {request.status === 'approved' ? t('previous_value') : t('current_value')}
                                </Label>
                                <div className="p-2 border rounded-md bg-background">
                                  {getCurrentValue(request, client) || t('not_provided')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {request.status === 'approved' ? t('new_value') : 
                                   request.status === 'rejected' ? t('rejected_value') : 
                                   t('requested_value')}
                                </Label>
                                <div className={`p-2 border rounded-md bg-background ${request.status === 'rejected' ? 'line-through' : 
                                                request.status === 'approved' ? 'font-medium' : ''}`}>
                                  {getRequestedValue(request) || t('not_provided')}
                                </div>
                              </div>
                            </div>
                            
                            {request.adminComment && (
                              <div className="mt-2 p-2 border rounded-md bg-muted/20">
                                <Label className="text-xs text-muted-foreground">
                                  {request.status === 'rejected' ? t('rejection_reason') : t('admin_comment')}
                                </Label>
                                <p className="text-sm">{request.adminComment}</p>
                              </div>
                            )}
                            
                            {request.status === 'pending' && (
                              <div className="flex items-center gap-2 justify-end mt-4">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleProcessUpdateRequest(request.id, 'reject')}
                                  disabled={reviewProfileUpdateMutation.status === 'pending'}
                                >
                                  {reviewProfileUpdateMutation.status === 'pending' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-2 h-4 w-4" />
                                  )}
                                  {t('reject')}
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => {
                                    // Get the selected fields for this request
                                    const requestFields = selectedFields[request.id] || {};
                                    
                                    // Check if any fields are selected
                                    const hasSelectedFields = Object.values(requestFields).some(v => v);

                                    // If no fields explicitly selected, select all fields
                                    if (!hasSelectedFields) {
                                      const fields = getRequestFields(request);
                                      const allFields = fields.reduce((obj, field) => {
                                        obj[field] = true;
                                        return obj;
                                      }, {} as Record<string, boolean>);
                                      
                                      handleProcessUpdateRequest(request.id, 'approve', allFields);
                                    } else {
                                      // Only pass selected fields
                                      handleProcessUpdateRequest(request.id, 'approve', requestFields);
                                    }
                                  }}
                                  disabled={reviewProfileUpdateMutation.status === 'pending'}
                                >
                                  {reviewProfileUpdateMutation.status === 'pending' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  {t('approve')}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Transactions section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('recent_transactions')}</CardTitle>
          <CardDescription>
            {t('showing_recent_transactions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {client.transactions && client.transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('id')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('reference')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.id}</TableCell>
                    <TableCell className="capitalize">{transaction.type}</TableCell>
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
                    <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              {t('no_transactions')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}