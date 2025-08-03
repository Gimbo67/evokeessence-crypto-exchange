import { useQuery } from "@tanstack/react-query";
import { useTranslations } from '@/lib/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, ExternalLink } from "lucide-react";
import { Link } from "wouter";
// Import employee layout
import { EmployeeLayout } from "../employee-dashboard/layout";

interface Client {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function EmployeeClients() {
  const t = useTranslations();
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/employee/clients"],
    queryFn: async () => {
      try {
        // First try the bypass endpoint for debugging
        console.log("Attempting to fetch clients via bypass endpoint");
        const bypassResponse = await fetch("/bypass/employee/clients", {
          credentials: "include"
        });

        // Log the response status and content type for debugging
        console.log("Bypass endpoint response status:", bypassResponse.status);
        console.log("Bypass endpoint content type:", bypassResponse.headers.get("Content-Type"));

        if (bypassResponse.ok) {
          const contentType = bypassResponse.headers.get("Content-Type");
          if (contentType && contentType.includes("application/json")) {
            const data = await bypassResponse.json();
            console.log("Successfully fetched clients via bypass endpoint:", data.length);
            return data;
          } else {
            console.warn("Bypass endpoint returned non-JSON content:", contentType);
            // Continue to try the regular endpoint
          }
        }

        // Fall back to regular endpoint if bypass fails
        console.log("Attempting regular endpoint");
        const response = await fetch("/api/employee/clients", {
          credentials: "include"
        });
        
        console.log("Regular endpoint response status:", response.status);
        console.log("Regular endpoint content type:", response.headers.get("Content-Type"));
        
        if (!response.ok) {
          throw new Error("Failed to fetch clients");
        }
        
        return response.json();
      } catch (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }
    },
  });

  const filteredClients = clients.filter(client => 
    client.username.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase()) ||
    client.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    client.phoneNumber?.toLowerCase().includes(search.toLowerCase()) ||
    client.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EmployeeLayout>
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('clients') || 'Clients'}</CardTitle>
            <CardDescription>{t('dashboard_manage_clients') || 'Manage client accounts and permissions'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search_clients') || 'Search clients...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('username')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('full_name')}</TableHead>
                  <TableHead>{t('phone')}</TableHead>
                  <TableHead>{t('country')}</TableHead>
                  <TableHead>{t('kyc_status')}</TableHead>
                  <TableHead>{t('created_at')}</TableHead>
                  <TableHead className="text-right">{t('details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      {t('loading')}...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      {t('no_clients_found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.username}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.fullName}</TableCell>
                      <TableCell>{client.phoneNumber || '-'}</TableCell>
                      <TableCell>{client.country || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          client.kycStatus === 'approved' ? 'default' :
                          client.kycStatus === 'rejected' ? 'destructive' :
                          'secondary'
                        }>
                          {t(`kyc_${client.kycStatus}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(client.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/employee/clients/${client.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {t('view_details')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}