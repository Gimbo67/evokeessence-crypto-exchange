import React from 'react';
import { useLocation } from 'wouter';
import { useUser } from '@/hooks/use-user';
import {
  BarChart3,
  LogOut,
  Menu,
  Users,
  CreditCard,
  Search,
  HardDrive,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from '@/lib/language-context';

interface AdminLayoutProps {
  panels: {
    id: string;
    title: string;
    defaultSize: number;
    content: React.ReactNode;
  }[];
}

const AdminLayout = ({ panels }: AdminLayoutProps) => {
  console.log("AdminLayout component rendering");
  const [location, navigate] = useLocation();
  const { user, isLoading } = useUser();
  console.log("AdminLayout received from useUser:", { user, isLoading });
  const { logout } = useAuth();
  const t = useTranslations();

  const menuItems = [
    { name: t('admin_dashboard'), path: '/admin/dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { name: t('admin_clients'), path: '/admin/clients', icon: <Users className="h-5 w-5" /> },
    { name: t('admin_transactions'), path: '/admin/transactions', icon: <CreditCard className="h-5 w-5" /> },
    { name: t('admin_analytics'), path: '/admin/analytics', icon: <Search className="h-5 w-5" /> },
    { name: t('admin_backup') || 'Backup System', path: '/admin/backup', icon: <HardDrive className="h-5 w-5" /> },
    { name: t('admin_employees') || 'Manage Employees', path: '/admin/employees', icon: <UserCog className="h-5 w-5" /> },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Check admin access
  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-2">{t('access_denied')}</h1>
        <p className="text-muted-foreground mb-4">{t('admin_access_required')}</p>
        <Button onClick={() => navigate('/')}>{t('return_home')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[rgb(8,9,12)]">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <nav className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-2">
                  {menuItems.map((item) => (
                    <Button
                      key={item.path}
                      variant={location === item.path ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2 transition-colors hover:bg-accent/10"
                      onClick={() => navigate(item.path)}
                    >
                      {item.icon}
                      {item.name}
                    </Button>
                  ))}
                </div>
                <div className="border-t border-border/40 p-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={logout}
                  >
                    <LogOut className="h-5 w-5" />
                    {t('logout')}
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex-1 flex items-center gap-4 ml-4">
            <h1 className="text-lg font-semibold hidden md:block">{t('admin_panel')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="hidden md:flex gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex w-[240px] flex-col border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={location === item.path ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 transition-colors hover:bg-accent/10"
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {item.name}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-[rgb(8,9,12)] text-white">
          {panels.map((panel) => (
            <div key={panel.id} style={{ height: `${panel.defaultSize}%` }}>
              {panel.content}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;