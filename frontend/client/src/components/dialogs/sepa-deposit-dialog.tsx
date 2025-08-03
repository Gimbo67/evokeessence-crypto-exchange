import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BanknoteIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const depositFormSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(Number(val)), "Must be a valid number")
    .refine(val => Number(val) >= 10, "Minimum deposit is €10")
    .refine(val => Number(val) <= 1000000, "Maximum deposit is €1,000,000"),
  currency: z.string().default("EUR")
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

interface DepositDetails {
  reference: string;
  amount: {
    currency: string;
    original: number;
    commission: number;
    final: number;
    userCurrency?: {
      amount: number;
      currency: string;
    },
    usdEquivalent?: number;
  };
  bankDetails?: {
    name: string;
    iban: string;
    bic: string;
  };
  exchangeRate?: number;
}

export function SepaDepositDialog() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [depositDetails, setDepositDetails] = useState<DepositDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: "",
      currency: "EUR"
    },
  });

  const createDeposit = useMutation({
    mutationFn: async (values: DepositFormValues) => {
      console.log('Creating deposit with values:', values);
      const response = await axios.post("/api/deposits", values, {
        withCredentials: true // Ensure cookies are sent for authentication
      });

      if (!response.data) {
        throw new Error("No data returned from server");
      }

      console.log('Deposit created successfully:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Deposit mutation succeeded with data:', data);
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["user-balance"] });
      setDepositDetails(data);
      if (data.id) {
        setLocation(`/deposit/${data.id}`);
      }
    },
    onError: (error: Error) => {
      console.error('Deposit creation failed:', error);
      toast({
        description: t("deposit_creation_failed") || error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: DepositFormValues) => {
    console.log('Submitting deposit form with values:', values);
    createDeposit.mutate(values);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setDepositDetails(null);
      form.reset();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <BanknoteIcon className="mr-2 h-4 w-4" />
          {t("create_deposit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("create_deposit")}</DialogTitle>
          <DialogDescription>
            {t("create_deposit_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!depositDetails ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("amount")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
                              return;
                            }
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createDeposit.isPending}
                >
                  {createDeposit.isPending ? t("creating_deposit") : t("create_deposit")}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <Card className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p>{t("amount")}</p>
                  <p>{depositDetails.amount.currency} {depositDetails.amount.original.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <p>{t("commission_fee")}</p>
                  <p>- {depositDetails.amount.currency} {depositDetails.amount.commission.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center font-bold border-t pt-2">
                  <p>{t("final_amount")}</p>
                  <p>{depositDetails.amount.currency} {depositDetails.amount.final.toFixed(2)}</p>
                </div>
              </Card>

              {depositDetails.bankDetails && (
                <Card className="p-4 space-y-2">
                  <h3 className="font-medium">{t("bank_details")}</h3>
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">{t("bank_name")}</p>
                    <p>{depositDetails.bankDetails.name}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">IBAN</p>
                    <p className="font-mono text-sm">{depositDetails.bankDetails.iban}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">BIC</p>
                    <p className="font-mono text-sm">{depositDetails.bankDetails.bic}</p>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                <FormLabel>{t("reference")}</FormLabel>
                <p className="text-sm font-mono">{depositDetails.reference}</p>
                <p className="text-xs text-muted-foreground">
                  {t("reference_note")}
                </p>
              </div>

              <Button onClick={handleClose} className="w-full">
                {t("close")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}