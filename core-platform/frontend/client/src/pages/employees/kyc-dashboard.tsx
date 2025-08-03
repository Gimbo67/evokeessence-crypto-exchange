import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeLayout } from "../../pages/employee-dashboard/layout";
import { useTranslations } from '@/lib/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface KYCUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  documentsCount: number;
}

export default function KYCEmployeeDashboard() {
  const t = useTranslations();

  const { data: users = [], isLoading } = useQuery<KYCUser[]>({
    queryKey: ['/api/employee/kyc/users'],
  });

  const pendingUsers = users.filter(user => user.kycStatus === 'pending');
  const otherUsers = users.filter(user => user.kycStatus !== 'pending');

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  const panels = [
    {
      id: 'pending-kyc',
      title: t('pending_kyc_verifications'),
      defaultSize: 40,
      content: (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('documents')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex">
                      <Badge variant="secondary">
                        {user.documentsCount} {t('documents')}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link href={`/employee/clients/${user.id}`}>
                        {t('review')}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
    {
      id: 'all-users',
      title: t('all_users'),
      defaultSize: 60,
      content: (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('kyc_status')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex">
                      <Badge
                        variant={
                          user.kycStatus === 'approved' ? 'default' :
                          user.kycStatus === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {t(`kyc_${user.kycStatus}`)}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      asChild
                    >
                      <Link href={`/employee/clients/${user.id}`}>
                        {t('view')}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ),
    },
  ];

  return (
    <EmployeeLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">{t('kyc_dashboard')}</h1>
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