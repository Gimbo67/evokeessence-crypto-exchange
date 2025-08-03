import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import type { User } from "@/hooks/use-user";
import { Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DepositForm } from "@/components/deposits/DepositForm";
import axios from "axios";

const depositFormSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(Number(val)), "Must be a valid number")
    .refine(val => Number(val) >= 10, "Minimum deposit is €10")
    .refine(val => Number(val) <= 1000000, "Maximum deposit is €1,000,000"),
  currency: z.enum(["EUR", "USD", "GBP", "CHF", "SEK"]),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

// Bank details are now provided by the server with a consistent reference number
const bankDetails = {
  name: "EvokeEssence s.r.o.",
  iban: "CZ1234567890123456789012",
  bic: "FIOBCZPPXXX",
  address: "Prague, Czech Republic"
};

interface DepositTabProps {
  user: User;
}

export default function DepositTab({ user }: DepositTabProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current commission rate
  const { data: commissionData } = useQuery({
    queryKey: ['commission-rate'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/settings/commission');
        return response.data;
      } catch (error) {
        console.error('Error fetching commission rate:', error);
        // Return default rate as fallback
        return { rate: 0.16 }; // 16% default commission
      }
    },
    staleTime: 3600000, // 1 hour
  });

  const commissionRate = commissionData?.rate || 0.16; // Use API rate or fallback to 16%

  // Create deposit mutation
  const createDeposit = useMutation({
    mutationFn: async (values: DepositFormValues) => {
      try {
        const response = await fetch("/api/deposits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      } catch (error) {
        // If server is not available, throw the error - 
        // we don't want to create deposits with inconsistent references
        if (!window.navigator.onLine || error instanceof TypeError) {
          throw new Error(t('network_error') || 'Network error. Please try again when online.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits"] });

      // Show success toast with calculated commission information
      toast({
        title: t('success'),
        description: t('deposit_created'),
      });

      // Log deposit details for debugging
      console.log('Deposit created:', {
        originalAmount: data.amount.original,
        currency: data.amount.currency,
        commission: data.amount.commission,
        finalAmount: data.amount.final,
        exchangeRate: data.exchangeRate
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, messageKey: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          description: t(`copy_${messageKey.toLowerCase()}`),
        });
      })
      .catch(() => {
        toast({
          description: t("copy_failed"),
          variant: "destructive",
        });
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('deposit_funds')}</CardTitle>
        <CardDescription>
          <Alert>
            <AlertDescription>
              {t('use_registered_account')}
            </AlertDescription>
          </Alert>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-1">
          <DepositForm user={user} createDeposit={createDeposit} />
        </div>

        {/* Commission info */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>{t('commission_note', { rate: (commissionRate * 100).toFixed(0) })}</p>
        </div>
      </CardContent>
    </Card>
  );
}