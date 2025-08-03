import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslations } from "@/lib/language-context";
import AdminLayout from "./layout";

export default function AdminDashboard() {
  console.log("AdminDashboard component rendering");
  const { user, isAdmin, isLoading } = useUser();
  console.log("AdminDashboard received from useUser:", { user, isAdmin, isLoading });
  const [_, navigate] = useLocation();
  const t = useTranslations();

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

  // Redirect if not admin
  if (!isAdmin) {
    console.log("User is not admin, redirecting to dashboard");
    navigate('/dashboard');
    return null;
  }

  const navItems = [
    {
      title: "dashboard_clients",
      description: t('dashboard_clients_description') || "Manage clients and their accounts",
      link: "/admin/clients",
      icon: "👥"
    },
    {
      title: "dashboard_transactions", 
      description: t('dashboard_transactions_description') || "View and manage all transactions",
      link: "/admin/transactions",
      icon: "💳"
    },
    {
      title: "dashboard_kyc",
      description: t('dashboard_kyc_description') || "Manage KYC verification and manual approvals",
      link: "/admin/kyc",
      icon: "🔍"
    },
    {
      title: "dashboard_analytics",
      description: t('dashboard_analytics_description') || "View system analytics and reports", 
      link: "/admin/analytics",
      icon: "📊"
    },
    {
      title: "dashboard_employees",
      description: t('dashboard_employees_description') || "Manage employee users and permissions", 
      link: "/admin/employees",
      icon: "👤"
    },
    {
      title: "dashboard_security",
      description: t('dashboard_security_description') || "Monitor security events and manage blocked IPs", 
      link: "/admin/security",
      icon: "🔒"
    },
    {
      title: "dashboard_blocked_users",
      description: "Manage blocked users and view block history",
      link: "/admin/blocked-users",
      icon: "🚫"
    }
  ];

  const panels = [{
    id: 'dashboard',
    title: t('dashboard'),
    defaultSize: 100,
    content: (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">{t('dashboard_welcome')}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <div
              key={item.link}
              className="cursor-pointer"
              onClick={() => navigate(item.link)}
            >
              <div className="p-6 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="text-lg font-semibold">{t(item.title)}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }];

  return <AdminLayout panels={panels} />;
}