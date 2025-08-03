import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

// Custom hook to check if a link is active
const useIsActive = (path: string) => {
  const [location] = useLocation();
  return location === path;
};
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

interface EmployeeLayoutProps {
  children: ReactNode;
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [username, setUsername] = React.useState<string>('Employee');

  // Simplified user data fetch without authentication checks
  // since EmployeeRoute already handles authentication
  React.useEffect(() => {
    let mounted = true;
    
    const fetchUserData = async () => {
      try {
        // Get the username just for display purposes
        const timestamp = new Date().getTime();
        const response = await axios.get(`/bypass/user?t=${timestamp}`, {
          withCredentials: true
        });
        
        if (!mounted) return; // Prevent state updates after unmount
        
        // Just extract the username or display a default
        if (response.data && response.data.username) {
          setUsername(response.data.username);
        } else {
          setUsername('Employee');
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching username:', error);
        // Don't redirect on error, just use default username
        setUsername('Employee');
      }
    };

    fetchUserData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('/bypass/auth/logout');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      navigate('/employee/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'An error occurred while logging out',
        variant: 'destructive',
      });
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Navigation links
  const navLinks = [
    {
      name: 'Dashboard',
      path: '/employee/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'Clients',
      path: '/employee/clients',
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: 'Transactions',
      path: '/employee/transactions',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: 'Settings',
      path: '/employee/settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navigation bar */}
      <header className="border-b sticky top-0 z-30 bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="md:hidden"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
              <span className="sr-only">Toggle menu</span>
            </Button>
            
            {/* Logo/Title */}
            <Link to="/employee/dashboard" className="flex items-center gap-2">
              <span className="font-bold text-xl">Employee Portal</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = useIsActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="max-w-[150px] truncate hidden sm:inline-block">
                    {username}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/employee/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/employee/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Overlay Menu) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background md:hidden pt-16">
          <nav className="container py-6">
            <ul className="space-y-6">
              {navLinks.map((link) => {
                const isActive = useIsActive(link.path);
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 text-lg font-medium ${
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </Link>
                  </li>
                )
              })}
              <li>
                <Button 
                  variant="destructive" 
                  className="w-full flex items-center justify-center gap-2 mt-4"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 bg-background">
        <div className="container flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} EvokeEssence s.r.o.</p>
          <p className="mt-2 sm:mt-0">Employee Portal v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}