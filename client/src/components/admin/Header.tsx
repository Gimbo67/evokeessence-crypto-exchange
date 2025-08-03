import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Users, FileText, BarChart3, Settings, Shield, Database, Download } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Admin Dashboard
            </Button>
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/admin/clients">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clients
            </Button>
          </Link>
          <Link href="/admin/transactions">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transactions
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/kyc">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              KYC
            </Button>
          </Link>
          <Link href="/admin/security">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Security
            </Button>
          </Link>
          <Link href="/admin/backup">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup
            </Button>
          </Link>
          <Link href="/admin/export">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}