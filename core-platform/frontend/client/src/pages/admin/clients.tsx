import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import AdminLayout from "./layout";

const PAGE_SIZE = 10;

type Client = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  userGroup: string;
  kycStatus: string;
  balance: number | string;
  lastLoginAt: string;
};

const getStatusColor = (status: string): "default" | "secondary" | "destructive" => {
  switch (status.toLowerCase()) {
    case "completed":
    case "successful":
    case "approved":
      return "default";
    case "failed":
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function ClientsPage() {
  const t = useTranslations();
  const [_, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/admin/clients", page, search],
    queryFn: async () => {
      try {
        console.log('Fetching clients with credentials, page:', page, 'search:', search);
        const searchParams = new URLSearchParams({
          page: page.toString(),
          limit: PAGE_SIZE.toString(),
          ...(search && { search: search })
        });
        const response = await fetch(`/api/admin/clients?${searchParams}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        });

        // Log response headers for debugging
        console.log('Response headers:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('Content-Type'),
          cacheControl: response.headers.get('Cache-Control')
        });

        if (!response.ok) {
          console.error('Failed to fetch clients:', response.status, response.statusText);
          
          // Special handling for authentication errors
          if (response.status === 401) {
            console.log('Authentication error detected, redirecting to login');
            setTimeout(() => {
              window.location.href = '/login?redirect=/admin/clients';
            }, 1000);
            throw new Error('Authentication required. Redirecting to login...');
          }
          
          // Try to parse the error message from the response
          let errorMessage = t('error_loading_clients');
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
        console.log('Clients data loaded successfully:', {
          count: data.clients.length,
          totalPages: data.totalPages,
          currentPage: data.currentPage
        });
        return data;
      } catch (err) {
        console.error('Error fetching clients:', err);
        throw err;
      }
    },
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000
  });

  const clients = data?.clients || [];
  const totalPages = data?.totalPages || 1;

  const handleClientClick = (clientId: number) => {
    const path = `/admin/clients/${clientId}`;
    setLocation(path);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const panels = [{
    id: 'clients',
    title: t('clients'),
    defaultSize: 100,
    content: (
      <div className="container py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-destructive mb-4">{t('error_loading_clients')}</p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-2"
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  t('try_again')
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('search_clients')}
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40">
                    <TableHead>{t('auth_username')}</TableHead>
                    <TableHead>{t('full_name')}</TableHead>
                    <TableHead>{t('auth_email')}</TableHead>
                    <TableHead>{t('dashboard_kyc')}</TableHead>
                    <TableHead>{t('dashboard_balance')}</TableHead>
                    <TableHead>{t('dashboard_last_login')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: Client) => {
                    const formattedBalance = typeof client.balance === 'number' 
                      ? client.balance.toFixed(2)
                      : parseFloat(client.balance as string || '0').toFixed(2);

                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-accent/5 border-b border-border/40"
                        onClick={() => handleClientClick(client.id)}
                      >
                        <TableCell>{client.username}</TableCell>
                        <TableCell>{client.fullName || '-'}</TableCell>
                        <TableCell>{client.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(client.kycStatus)}>
                            {t(`kyc_status_${client.kycStatus.toLowerCase()}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>${formattedBalance}</TableCell>
                        <TableCell>
                          {client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        {t('dashboard_no_clients')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('pagination_info', { current: page, total: totalPages })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page === totalPages || isFetching}
                  >
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    ),
  }];

  return <AdminLayout panels={panels} />;
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Last Login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(PAGE_SIZE)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(6)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}