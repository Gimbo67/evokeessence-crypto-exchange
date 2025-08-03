import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { User } from "@/hooks/use-user";
import { RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const usdcSchema = z.object({
  amountUsd: z.number()
    .min(10, "Minimum amount is 10 USDC")
    .max(200000, "Maximum amount is 200,000 USDC"),
  usdcAddress: z.string().min(32, "Invalid USDC address").max(44, "Invalid USDC address"),
});

type UsdcFormData = z.infer<typeof usdcSchema>;

interface UsdcTabProps {
  user: User;
}

export default function UsdcTab({ user }: UsdcTabProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch live exchange rate
  const { data: rateData } = useQuery({
    queryKey: ['usdc-rate'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/exchange/usdc-rate');
        if (!response.ok) throw new Error('Failed to fetch USDC rate');
        return response.json();
      } catch (error) {
        console.error('Error fetching USDC rate:', error);
        return { rate: 1.0002, lastUpdate: new Date().toISOString() };
      }
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000 // 5 minutes
  });

  const exchangeRate = rateData?.rate || 1.0002;
  const lastUpdate = rateData?.lastUpdate ? new Date(rateData.lastUpdate) : new Date();

  const purchaseUsdcMutation = useMutation({
    mutationFn: async (data: UsdcFormData) => {
      console.log('Attempting USDC purchase:', data);
      const response = await fetch("/api/usdc/purchase", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to process USDC purchase" }));
        throw new Error(errorData.message || "Failed to process USDC purchase");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/usdc/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: t("success"),
        description: t("usdc_purchase_success"),
      });
      form.reset();

      // Log the transaction data for debugging
      console.log('USDC purchase successful:', data);
    },
    onError: (error: Error) => {
      console.error('USDC purchase error:', error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("usdc_purchase_failed"),
      });
    },
  });

  const onSubmit = async (data: UsdcFormData) => {
    try {
      if (!user) {
        throw new Error(t("login_required"));
      }

      const userBalance = parseFloat(user.balance?.toString() || '0');
      if (data.amountUsd > userBalance) {
        throw new Error(t("insufficient_balance"));
      }

      await purchaseUsdcMutation.mutateAsync(data);
    } catch (error: any) {
      console.error('USDC purchase submission error:', error);
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("usdc_purchase_failed")
      });
    }
  };

  const form = useForm<UsdcFormData>({
    resolver: zodResolver(usdcSchema),
    defaultValues: {
      amountUsd: undefined, // Start with empty field rather than 0
      usdcAddress: "",
    },
    mode: "onChange", // Validate on change for better UX
  });

  // Calculate preview values
  const watchedAmount = form.watch("amountUsd") || 0;
  const estimatedUsdc = watchedAmount * exchangeRate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("usdc_purchase")}</CardTitle>
        <CardDescription>
          {t("current_rate")}: 1 USD = {exchangeRate.toFixed(4)} USDC
          <span className="text-xs text-muted-foreground ml-2">
            {t("last_update")}: {format(lastUpdate, 'HH:mm:ss')}
            <RefreshCw className="inline-block ml-1 h-3 w-3" />
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("important")}</AlertTitle>
          <AlertDescription>
            {t("usdc_purchase_notice")}
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amountUsd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("usdc_amount")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="0.00"
                      className="font-mono"
                      {...field}
                      value={field.value === undefined || field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        // Only allow numeric input with up to 2 decimal places
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
                          return;
                        }
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    10 USDC - 200,000 USDC ({t("min_max_amount")})
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedAmount > 0 && (
              <div className="bg-muted/30 p-3 rounded-md text-sm mb-2">
                <div className="flex justify-between mb-1">
                  <span>{t("you_spend")}:</span>
                  <span className="font-medium">${watchedAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("you_receive")}:</span>
                  <span className="font-medium">{estimatedUsdc.toFixed(2)} USDC</span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="usdcAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("usdc_address")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Solana USDC wallet address" />
                  </FormControl>
                  <FormDescription>
                    {t("enter_solana_usdc_wallet")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={purchaseUsdcMutation.isPending || !form.formState.isValid}
            >
              {purchaseUsdcMutation.isPending ? t("processing") : t("buy_now")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}