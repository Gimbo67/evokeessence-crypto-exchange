
import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, LayoutDashboard, Settings, Shield } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/lib/language-context";
import { useQuery } from "@tanstack/react-query";

export function Header() {
  const { user } = useAuth();
  const { logout } = useAuth();
  const [_, setLocation] = useLocation();
  const t = useTranslations();
  const [has2FA, setHas2FA] = useState<boolean | null>(null);
  
  // Fetch user's 2FA status if logged in
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['/api/2fa/status', user?.id],
    queryFn: async () => {
      try {
        // If user is logged in, fetch their specific status
        if (user) {
          const response = await fetch('/api/2fa/status');
          if (!response.ok) return { enabled: false };
          return response.json();
        }
        return { enabled: false };
      } catch (error) {
        console.error('Error fetching 2FA status:', error);
        return { enabled: false };
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  
  // Fetch platform's 2FA availability status (public)
  const { data: publicTwoFactorStatus } = useQuery({
    queryKey: ['/api/2fa/public-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/2fa/public-status');
        if (!response.ok) return { available: false };
        return response.json();
      } catch (error) {
        console.error('Error fetching public 2FA status:', error);
        return { available: false };
      }
    },
    refetchOnWindowFocus: false,
  });
  
  useEffect(() => {
    if (twoFactorStatus) {
      setHas2FA(twoFactorStatus.enabled);
    }
  }, [twoFactorStatus]);

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <div className="container flex h-16 items-center justify-between">
        <div className="font-semibold text-primary" onClick={() => setLocation('/')} style={{ cursor: 'pointer' }}>
          Crypto Exchange
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <UserIcon size={16} />
                  <span>{user.username || user.email}</span>
                  {has2FA !== null && (
                    <Badge variant={has2FA ? "success" : "outline"} className="ml-1">
                      <Shield className="h-3 w-3 mr-1" />
                      {has2FA ? t('2fa_enabled') : t('2fa_disabled')}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.isAdmin && (
                  <DropdownMenuItem onClick={() => setLocation('/admin')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                )}
                {user.isEmployee && (
                  <DropdownMenuItem onClick={() => setLocation('/employees')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Employee Dashboard</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              {publicTwoFactorStatus?.available && (
                <Badge variant="success" className="mr-2">
                  <Shield className="h-3 w-3 mr-1" />
                  {t('2fa_available')}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => setLocation('/auth/login')}>
                Login
              </Button>
              <Button onClick={() => setLocation('/auth/register')}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
