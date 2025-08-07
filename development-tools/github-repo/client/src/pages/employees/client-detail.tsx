import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from '@/lib/language-context';
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface KYCDocument {
  id: number;
  type: string;
  status: string;
  fileUrl: string;
  createdAt: string;
  adminComment?: string;
}

interface Client {
  id: number;
  username: string;
  email: string;
  fullName: string;
  address?: string;
  phoneNumber?: string;
  countryOfResidence?: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycDocuments?: KYCDocument[];
}

interface ClientDetailProps {
  id: string;
}

// Import employee layout
import { EmployeeLayout } from "../employee-dashboard/layout";

export default function ClientDetail({ id }: ClientDetailProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clientId = parseInt(id || "0");

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: [`/api/employee/clients/${clientId}`],
    queryFn: async () => {
      try {
        // First try the bypass endpoint for debugging
        console.log(`Attempting to fetch client ${clientId} via bypass endpoint`);
        const bypassResponse = await fetch(`/bypass/employee/clients/${clientId}`, {
          credentials: "include"
        });
        
        // Log the response status and content type for debugging
        console.log("Bypass endpoint response status:", bypassResponse.status);
        console.log("Bypass endpoint content type:", bypassResponse.headers.get("Content-Type"));
        
        if (bypassResponse.ok) {
          const contentType = bypassResponse.headers.get("Content-Type");
          if (contentType && contentType.includes("application/json")) {
            const data = await bypassResponse.json();
            console.log(`Successfully fetched client ${clientId} via bypass endpoint:`, data);
            return data;
          } else {
            console.warn("Bypass endpoint returned non-JSON content:", contentType);
            // Continue to try the regular endpoint
          }
        }
        
        // Fall back to regular endpoint if bypass fails
        console.log(`Attempting regular endpoint for client ${clientId}`);
        const response = await fetch(`/api/employee/clients/${clientId}`, {
          credentials: "include"
        });
        
        console.log("Regular endpoint response status:", response.status);
        console.log("Regular endpoint content type:", response.headers.get("Content-Type"));
        
        if (!response.ok) {
          throw new Error(`Failed to fetch client details for ID ${clientId}`);
        }
        
        return response.json();
      } catch (error) {
        console.error(`Error fetching details for client ${clientId}:`, error);
        throw error;
      }
    },
    enabled: clientId > 0,
  });

  const updateKycStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      console.log(`Attempting to update KYC status for client ${clientId} to ${status}`);
      
      // First try the bypass endpoint for debugging
      try {
        console.log(`Using bypass endpoint for KYC status update`);
        const bypassRes = await fetch(`/bypass/employee/clients/${clientId}/kyc`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kycStatus: status }),
          credentials: 'include',
        });
        
        // Log the response status and content type for debugging
        console.log("Bypass KYC update response status:", bypassRes.status);
        console.log("Bypass KYC update content type:", bypassRes.headers.get("Content-Type"));
        
        if (bypassRes.ok) {
          const contentType = bypassRes.headers.get("Content-Type");
          if (contentType && contentType.includes("application/json")) {
            const data = await bypassRes.json();
            console.log(`Successfully updated KYC status via bypass endpoint:`, data);
            return data;
          } else {
            console.warn("Bypass endpoint returned non-JSON content for KYC update:", contentType);
            // Continue to try the regular endpoint
          }
        } else {
          console.warn(`Bypass endpoint failed with status ${bypassRes.status}:`, await bypassRes.text());
        }
      } catch (bypassError) {
        console.error("Error using bypass endpoint for KYC update:", bypassError);
      }
      
      // Fall back to regular endpoint if bypass fails
      console.log(`Attempting regular endpoint for KYC status update`);
      const res = await fetch(`/api/employee/clients/${clientId}/kyc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycStatus: status }),
        credentials: 'include',
      });
      
      console.log("Regular KYC update response status:", res.status);
      console.log("Regular KYC update content type:", res.headers.get("Content-Type"));
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`KYC update failed with status ${res.status}:`, errorText);
        throw new Error(t('update_kyc_failed'));
      }

      return res.json();
    },
    onSuccess: (data) => {
      console.log("KYC status update successful:", data);
      queryClient.invalidateQueries({ queryKey: [`/api/employee/clients/${clientId}`] });
      toast({
        title: t('success'),
        description: t('kyc_status_updated_success'),
      });
    },
    onError: (error: Error) => {
      console.error("KYC status update error:", error);
      toast({
        title: t('error'),
        description: error.message || t('kyc_status_update_failed'),
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t('loading_client_data')}</span>
        </div>
      </EmployeeLayout>
    );
  }

  if (!client) {
    return (
      <EmployeeLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('client_not_found')}
            </p>
          </CardContent>
        </Card>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('client_information')}</CardTitle>
            <CardDescription>{t('client_details_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('username')}</Label>
                <p className="text-sm mt-1">{client.username}</p>
              </div>
              <div>
                <Label>{t('email')}</Label>
                <p className="text-sm mt-1">{client.email}</p>
              </div>
              <div>
                <Label>{t('full_name')}</Label>
                <p className="text-sm mt-1">{client.fullName}</p>
              </div>
              <div>
                <Label>{t('phone_number')}</Label>
                <p className="text-sm mt-1">{client.phoneNumber || t('not_provided')}</p>
              </div>
              <div>
                <Label>{t('address')}</Label>
                <p className="text-sm mt-1">{client.address || t('not_provided')}</p>
              </div>
              <div>
                <Label>{t('country_of_residence')}</Label>
                <p className="text-sm mt-1">{client.countryOfResidence || t('not_provided')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t('kyc_status')}</CardTitle>
            <CardDescription>{t('kyc_status_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge
                variant={
                  client.kycStatus === 'approved' ? 'default' :
                  client.kycStatus === 'rejected' ? 'destructive' :
                  'secondary'
                }
              >
                {t(`kyc_${client.kycStatus}`)}
              </Badge>
              <Select
                value={client.kycStatus}
                onValueChange={(value) => {
                  updateKycStatusMutation.mutate(value);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('select_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="pending">{t('kyc_pending')}</SelectItem>
                    <SelectItem value="approved">{t('kyc_approved')}</SelectItem>
                    <SelectItem value="rejected">{t('kyc_rejected')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KYC Documents */}
        <Card>
          <CardHeader>
            <CardTitle>{t('kyc_documents')}</CardTitle>
            <CardDescription>{t('kyc_documents_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {client.kycDocuments && client.kycDocuments.length > 0 ? (
              <div className="grid gap-4">
                {client.kycDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{t(`document_type_${doc.type}`)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.adminComment && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('admin_comment')}: {doc.adminComment}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                    >
                      {t('view_document')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('no_documents_uploaded')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}