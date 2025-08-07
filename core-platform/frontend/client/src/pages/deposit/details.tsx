import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BankDetails } from "@/components/deposits/BankDetails";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeftCircle, ClockIcon, Landmark, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function DepositDetails() {
  const [location, setLocation] = useLocation();
  const depositId = location.split('/').pop();
  const t = useTranslations();

  const { data: depositDetails, isLoading, error } = useQuery({
    queryKey: ["deposit", depositId],
    queryFn: async () => {
      if (!depositId) throw new Error("No deposit ID provided");

      const response = await fetch(`/api/deposits/${depositId}`, {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deposit details: ${response.status}`);
      }

      return response.json();
    },
    retry: 3,
    retryDelay: 1000,
    enabled: !!depositId,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader className="flex items-center justify-center py-8">
            <LoadingSpinner size={32} />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !depositDetails) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("error")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("deposit_details_not_found")}</p>
            <Button 
              onClick={() => setLocation("/dashboard")} 
              className="mt-4"
            >
              {t("back_to_dashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <ErrorBoundary>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("deposit_details")}</CardTitle>
                <CardDescription>{t("deposit_reference")}: {depositDetails.reference}</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation("/dashboard")}
                className="hidden sm:flex items-center gap-2"
              >
                <ArrowLeftCircle className="h-4 w-4" />
                {t("back_to_dashboard")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="default" className="border-primary/20">
              <Landmark className="h-4 w-4" />
              <AlertTitle>{t("deposit_initiated")}</AlertTitle>
              <AlertDescription>
                {t("deposit_initiated_description")}
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-medium text-base mb-3">{t("deposit_amount_details")}</h3>
                <Card className="p-4 space-y-2 bg-card">
                  <div className="flex justify-between items-center">
                    <p>{t("dashboard_amount")}</p>
                    <p>{depositDetails.amount.currency} {depositDetails.amount.original.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <p>{t("dashboard_commission_fee")}</p>
                    <p>- {depositDetails.amount.currency} {depositDetails.amount.commission.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center font-bold border-t pt-2">
                    <p>{t("dashboard_final_amount")}</p>
                    <p>{depositDetails.amount.currency} {depositDetails.amount.final.toFixed(2)}</p>
                  </div>
                </Card>
              </div>

              <Separator />

              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-medium text-base mb-3">{t("payment_instructions")}</h3>
                <BankDetails 
                  name={depositDetails.bankDetails.name}
                  iban={depositDetails.bankDetails.iban}
                  bic={depositDetails.bankDetails.bic}
                  address={depositDetails.bankDetails.address}
                  reference={depositDetails.reference}
                />

                <div className="flex items-center justify-between p-3 mt-4 bg-muted/40 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{t("dashboard_processing_time")}</p>
                  </div>
                  <p className="text-muted-foreground">1-3 {t("dashboard_business_days")}</p>
                </div>
              </div>

              <Alert variant="default" className="bg-muted/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("dashboard_important")}</AlertTitle>
                <AlertDescription>
                  {t("deposit_reference_important")}
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/dashboard")} 
                className="sm:hidden"
              >
                {t("back_to_dashboard")}
              </Button>

              <Button 
                onClick={() => setLocation("/transactions")} 
                className="ml-auto"
              >
                {t("view_transactions")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  );
}