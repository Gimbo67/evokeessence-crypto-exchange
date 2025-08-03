import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch, useLocation } from "wouter";
import { useState, useCallback } from "react";
import { LanguageProvider } from "@/lib/language-context";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import React, { Suspense, useEffect } from 'react';

// Pages
import Home from "@/pages/home";
import Team from "@/pages/team";
import Contact from "@/pages/contact";
import FAQ from "@/pages/faq";
import Legal from "@/pages/legal";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Support from "@/pages/support";
import LoadingPage from "@/pages/loading";
import EmailVerifiedPage from "@/pages/email-verified";
import PasswordReset from "@/pages/password-reset";

// Testing pages
import DepositTest from "@/pages/test/deposit-test";
import ExportTest from "@/pages/test/export-test";
import PdfTest from "@/pages/test/pdf-test";
import TwoFactorTest from "@/pages/test/2fa-test";
import TwoFactorBypassTest from "@/pages/test/2fa-bypass-test";
import TestEmployeeLogin from "@/pages/test-employee-login";

// Lazy loaded components
const AdminDashboard = React.lazy(() => import("@/pages/admin/dashboard"));
const AdminClients = React.lazy(() => import("@/pages/admin/clients"));
const AdminClientDetail = React.lazy(() => import("@/pages/admin/client/[id]"));
const AdminTransactions = React.lazy(() => import("@/pages/admin/transactions"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/analytics"));
const BackupDashboard = React.lazy(() => import("@/pages/admin/backup"));
const ManageEmployees = React.lazy(() => import("@/pages/admin/manage-employees"));
const SecurityDashboard = React.lazy(() => import("@/pages/admin/SecurityDashboard"));

// Employee components
const EmployeeLogin = React.lazy(() => import("@/pages/employee-login"));
const EmployeeDashboard = React.lazy(() => import("@/pages/employee-dashboard/index"));
const EmployeeClients = React.lazy(() => import("@/pages/employees/clients"));
const EmployeeClientDetail = React.lazy(() => import("@/pages/employees/client-detail"));
const EmployeeTransactions = React.lazy(() => import("@/pages/employees/transactions"));
const EmployeeAnalytics = React.lazy(() => import("@/pages/employees/analytics"));
const EmployeeDocuments = React.lazy(() => import("@/pages/employees/documents"));
const KYCDashboard = React.lazy(() => import("@/pages/employees/kyc-dashboard"));

// Contractor components
const ContractorDashboard = React.lazy(() => import("@/pages/contractor/dashboard"));

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Route path="/auth" />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading
    
    // Only redirect if not authenticated or not an admin
    if (!isAuthenticated || !user?.isAdmin) {
      console.log("Not authenticated as admin, redirecting to dashboard", {
        isAuthenticated,
        isAdmin: user?.isAdmin,
        user
      });
      setLocation('/dashboard');
    } else {
      console.log("Admin authentication verified", {
        isAuthenticated,
        isAdmin: user?.isAdmin,
        userGroup: user?.userGroup
      });
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // If not authenticated as admin, show loading (redirect will happen via useEffect)
  if (!isAuthenticated || !user?.isAdmin) {
    return <LoadingPage />;
  }

  console.log("Rendering admin route with user:", user);
  return <>{children}</>;
};

// Employee Route Component - Simplified to avoid redirect loops
const EmployeeRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading
    
    // Only redirect if certainly not authenticated or not an employee
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to employee login");
      setLocation('/employee/login');
      return;
    }
    
    if (user && !user.isEmployee) {
      console.log("User is not an employee, redirecting to employee login");
      setLocation('/employee/login');
      return;
    }
    
    console.log("Employee authentication verified", {
      isAuthenticated,
      isEmployee: user?.isEmployee,
      userGroup: user?.userGroup
    });
  }, [isLoading, isAuthenticated, user, setLocation]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // If not authenticated as employee, show loading (redirect will happen via useEffect)
  if (!isAuthenticated || !user?.isEmployee) {
    return <LoadingPage />;
  }

  console.log("Rendering employee route with user:", user);
  return <>{children}</>;
};

// Contractor Route Component
const ContractorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while loading
    
    // Only redirect if not authenticated or not a contractor
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      setLocation('/auth');
      return;
    }
    
    if (user && !user.isContractor) {
      console.log("User is not a contractor, redirecting to dashboard");
      setLocation('/dashboard');
      return;
    }
    
    console.log("Contractor authentication verified", {
      isAuthenticated,
      isContractor: user?.isContractor,
      referralCode: user?.referralCode
    });
  }, [isLoading, isAuthenticated, user, setLocation]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />;
  }

  // If not authenticated as contractor, show loading (redirect will happen via useEffect)
  if (!isAuthenticated || !user?.isContractor) {
    return <LoadingPage />;
  }

  console.log("Rendering contractor route with user:", user);
  return <>{children}</>;
};

// Using wouter 2.12.0 which doesn't need a custom HTML transformer
// This version of wouter doesn't have the "Missing router-decoder: htmlTransformer" error

function Router() {
  console.log("Initializing Router");
  
  // Standard location hook (no special transformer needed in wouter 2.12.0)
  const [location, setLocation] = useLocation();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/team" component={Team} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/legal" component={Legal} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/support" component={Support} />
      <Route path="/verify-email" component={EmailVerifiedPage} />
      <Route path="/password-reset" component={PasswordReset} />
      <Route path="/employee/login">
        {() => (
          <Suspense fallback={<LoadingPage />}>
            <EmployeeLogin />
          </Suspense>
        )}
      </Route>

      {/* Protected regular user routes */}
      <Route path="/dashboard">
        {() => {
          const { user } = useAuth();
          
          // If the user is a contractor, redirect them to the contractor dashboard
          if (user?.isContractor) {
            console.log("User is a contractor, redirecting to contractor dashboard");
            
            return (
              <Suspense fallback={<LoadingPage />}>
                <ContractorDashboard />
              </Suspense>
            );
          }
          
          // Otherwise, show the regular dashboard
          return (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          );
        }}
      </Route>

      {/* Test pages */}
      <Route path="/test/deposit">
        {() => (
          <ProtectedRoute>
            <DepositTest />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* 2FA test pages - publicly accessible for testing */}
      <Route path="/test/2fa" component={TwoFactorTest} />
      <Route path="/test/2fa-bypass" component={TwoFactorBypassTest} />
      <Route path="/test/export-test" component={ExportTest} />
      <Route path="/test/pdf-test" component={PdfTest} />
      <Route path="/test/employee-login" component={TestEmployeeLogin} />

      {/* Protected admin routes - specific routes first */}
      <Route path="/admin/clients/:id">
        {(params) => {
          console.log("Matching admin client detail route with params:", params);
          return (
            <AdminRoute>
              <Suspense fallback={<LoadingPage />}>
                <AdminClientDetail id={params.id} />
              </Suspense>
            </AdminRoute>
          );
        }}
      </Route>

      <Route path="/admin/clients">
        {() => {
          console.log("Matching admin clients list route");
          return (
            <AdminRoute>
              <Suspense fallback={<LoadingPage />}>
                <AdminClients />
              </Suspense>
            </AdminRoute>
          );
        }}
      </Route>

      <Route path="/admin/dashboard">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <AdminDashboard />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      <Route path="/admin">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <AdminDashboard />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      <Route path="/admin/transactions">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <AdminTransactions />
            </Suspense>
          </AdminRoute>
        )}
      </Route>
      
      <Route path="/admin/backup">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <BackupDashboard />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      <Route path="/admin/analytics">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <AdminAnalytics />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      <Route path="/admin/employees">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <ManageEmployees />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      <Route path="/admin/security">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <SecurityDashboard />
            </Suspense>
          </AdminRoute>
        )}
      </Route>
      
      <Route path="/admin/security-dashboard">
        {() => (
          <AdminRoute>
            <Suspense fallback={<LoadingPage />}>
              <SecurityDashboard />
            </Suspense>
          </AdminRoute>
        )}
      </Route>

      {/* Protected employee routes */}
      <Route path="/employee/dashboard">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeDashboard />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeDashboard />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/clients/:id">
        {(params) => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeClientDetail id={params.id} />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/clients">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeClients />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/transactions">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeTransactions />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/analytics">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeAnalytics />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/documents">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <EmployeeDocuments />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      <Route path="/employee/kyc">
        {() => (
          <EmployeeRoute>
            <Suspense fallback={<LoadingPage />}>
              <KYCDashboard />
            </Suspense>
          </EmployeeRoute>
        )}
      </Route>

      {/* Protected contractor routes */}
      <Route path="/contractor/dashboard">
        {() => (
          <ContractorRoute>
            <Suspense fallback={<LoadingPage />}>
              <ContractorDashboard />
            </Suspense>
          </ContractorRoute>
        )}
      </Route>

      <Route path="/contractor">
        {() => (
          <ContractorRoute>
            <Suspense fallback={<LoadingPage />}>
              <ContractorDashboard />
            </Suspense>
          </ContractorRoute>
        )}
      </Route>

      {/* Catch-all route for 404 */}
      <Route>
        {() => {
          console.log("No route match - rendering 404");
          return <NotFound />;
        }}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <SidebarProvider>
            <Router />
            <Toaster />
          </SidebarProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}