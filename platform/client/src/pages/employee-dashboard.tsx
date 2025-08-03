import { useUser } from "@/hooks/use-user";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useTranslations } from '@/lib/language-context';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HoverCard } from "@/components/ui/animated-card";
import { motion } from "framer-motion";
import { listItemAnimation } from "@/lib/animation-utils";

export default function EmployeeDashboard() {
  const { user } = useUser();
  const t = useTranslations();

  if (!user) return null;

  const dashboardItems = [
    {
      title: "Documents",
      description: "Manage and view documents",
      link: "/employee/documents",
      icon: "📄"
    },
    {
      title: "Users",
      description: "View and manage users",
      link: "/employee/users",
      icon: "👥"
    },
    {
      title: "Transactions",
      description: "View transaction history",
      link: "/employee/transactions",
      icon: "💳"
    },
    {
      title: "Analytics",
      description: "View system analytics",
      link: "/employee/analytics",
      icon: "📊"
    },
    {
      title: "Clients",
      description: "Manage client accounts",
      link: "/employee/clients",
      icon: "🏢"
    }
  ];

  const panels = [
    {
      id: 'dashboard',
      title: t('dashboard'),
      defaultSize: 100,
      content: (
        <div className="container py-6">
          <motion.h1 
            className="text-3xl font-bold mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {t('dashboard')}
          </motion.h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboardItems.map((item, index) => (
              <motion.div
                key={item.link}
                {...listItemAnimation(index)}
              >
                <Link href={item.link}>
                  <HoverCard className="cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <motion.span
                          whileHover={{ scale: 1.2 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.icon}
                        </motion.span>
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                  </HoverCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    }
  ];

  return <DashboardLayout panels={panels} />;
}