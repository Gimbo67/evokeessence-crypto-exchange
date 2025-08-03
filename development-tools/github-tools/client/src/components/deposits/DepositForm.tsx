import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, DollarSign, Copy, Check, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { User } from "@/hooks/use-user";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format } from 'date-fns';
import axios from "axios";
import { useTranslations } from "@/lib/language-context";

// Constants
const COMMISSION_RATE = 0.16; // 16%

const CURRENCY_LIMITS = {
  USD: { min: 100, max: 200000, symbol: '$', name: 'US Dollar' },
  EUR: { min: 100, max: 200000, symbol: '€', name: 'Euro' },
  GBP: { min: 100, max: 200000, symbol: '£', name: 'British Pound' },
  CHF: { min: 100, max: 200000, symbol: 'CHF', name: 'Swiss Franc' }
} as const;

const CURRENCY_PROCESSING = {
  USD: { time: '2-3', note: 'International transfer via SWIFT', estimatedArrival: 'Typically 2-3 business days' },
  EUR: { time: '1-2', note: 'SEPA transfer within Europe', estimatedArrival: 'Next business day for SEPA' },
  GBP: { time: '1-2', note: 'Faster Payments in UK', estimatedArrival: 'Same or next business day' },
  CHF: { time: '1-2', note: 'Local Swiss transfer', estimatedArrival: 'Usually same business day' },
  SEK: { time: '2-3', note: 'International SWIFT transfer', estimatedArrival: 'Up to 3 business days' }
} as const;

// Helper functions
function getEstimatedCompletionDate(currency: keyof typeof CURRENCY_PROCESSING) {
  const processing = CURRENCY_PROCESSING[currency];
  const maxDays = parseInt(processing.time.split('-')[1]);
  const date = new Date();
  date.setDate(date.getDate() + maxDays);
  return format(date, 'EEE, MMM d');
}

// Component interfaces
interface CopyButtonProps {
  text: string;
  label: string;
  toast: any;
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  additionalInfo?: string;
  completed?: boolean;
  current?: boolean;
}

// Child components
const CopyButton: React.FC<CopyButtonProps> = ({ text, label, toast }) => {
  const [copied, setCopied] = React.useState(false);
  const t = useTranslations();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      description: `${label} ${t("copied_to_clipboard")}`,
      duration: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className="p-1 hover:bg-muted rounded transition-colors"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const TimelineStep: React.FC<StepProps> = ({ number, title, description, additionalInfo, completed, current }) => (
  <div className="flex items-start gap-2">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200
      ${completed ? 'bg-green-500 text-white' : current ? 'bg-primary/20 text-primary' : 'bg-primary/10'}`}>
      {completed ? <Check className="h-4 w-4" /> : <span className="text-xs">{number}</span>}
    </div>
    <div>
      <p className={`font-medium transition-colors duration-200 
        ${completed ? 'text-green-700' : current ? 'text-primary' : ''}`}>
        {title}
      </p>
      <p className="text-muted-foreground">{description}</p>
      {additionalInfo && (
        <p className="text-xs text-muted-foreground mt-1">{additionalInfo}</p>
      )}
    </div>
  </div>
);

// Form schema
const depositFormSchema = z.object({
  currency: z.enum(["EUR", "USD", "GBP", "CHF", "SEK"]).default("EUR"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(Number(val)), "Please enter a valid number")
}).superRefine((data, ctx) => {
  const amount = Number(data.amount);
  const currency = data.currency || "EUR";

  if (isNaN(amount)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid number",
      path: ["amount"]
    });
    return;
  }

  // Handle SEK separately since it's not in CURRENCY_LIMITS
  if (currency === "SEK") {
    if (amount < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Minimum deposit amount is kr100 for SEK`,
        path: ["amount"]
      });
    }
    if (amount > 200000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Maximum deposit amount is kr200,000 for SEK`,
        path: ["amount"]
      });
    }
    return;
  }

  const limits = CURRENCY_LIMITS[currency as keyof typeof CURRENCY_LIMITS];

  if (amount < limits.min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum deposit amount is ${limits.symbol}${limits.min.toLocaleString()} for ${currency}`,
      path: ["amount"]
    });
  }

  if (amount > limits.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Maximum deposit amount is ${limits.symbol}${limits.max.toLocaleString()} for ${currency}`,
      path: ["amount"]
    });
  }
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

interface DepositFormProps {
  onStepChange?: React.Dispatch<React.SetStateAction<number>>;
  user?: User;
  createDeposit?: any; // UseMutationResult type
  className?: string;
}

export function DepositForm({ onStepChange, user, createDeposit: externalCreateDeposit, className }: DepositFormProps) {
  const { toast } = useToast();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = React.useState(!window.navigator.onLine);
  const [progress, setProgress] = React.useState(0);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [formValues, setFormValues] = React.useState<DepositFormValues | null>(null);
  const [localUser, setLocalUser] = React.useState<any>(user || { id: 'loading' });
  const [depositReference, setDepositReference] = React.useState<string | null>(() => {
    // Generate temporary reference for display until we get the real one from server
    return `PAY-${localUser?.id || user?.id || 'user'}-${Date.now().toString().slice(-6)}`;
  });

  // Fetch commission rate from server (centralizing configuration)
  const { data: commissionData } = useQuery({
    queryKey: ['settings', 'commission'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/settings/commission');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch commission rate:', error);
        // Fall back to default rate
        return { rate: COMMISSION_RATE };
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Use the server-provided commission rate or fall back to default
  const commissionRate = commissionData?.rate || COMMISSION_RATE;

  // Fetch user info if not provided externally
  React.useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        try {
          const response = await axios.get('/api/user');
          setLocalUser(response.data.user);
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchUser();
    }
  }, [user]);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: t("connection_restored"),
        description: t("deposits_available"),
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        variant: "destructive",
        title: t("connection_lost"),
        description: t("deposits_unavailable_offline"),
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, t]);

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: "",
      currency: "EUR"
    }
  });

  // Use the provided createDeposit mutation if available, otherwise create our own
  const internalCreateDeposit = useMutation({
    mutationFn: async (values: DepositFormValues) => {
      console.log('Submitting deposit request:', values);
      const response = await axios.post('/api/deposits', values, {
        withCredentials: true // Ensure cookies are sent for authentication
      });
      console.log('Deposit response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      if (onStepChange) onStepChange(2); // Move to the final step
    }
  });

  // Choose which mutation to use
  const depositMutation = externalCreateDeposit || internalCreateDeposit;

  const onSubmit = (values: DepositFormValues) => {
    if (isOffline) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("deposits_unavailable_offline_check"),
        duration: 5000,
      });
      return;
    }

    setFormValues(values);
    setShowConfirmation(true);
    if (onStepChange) onStepChange(1); // Move to confirmation step
  };

  const confirmDeposit = () => {
    if (!formValues) return;

    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    depositMutation.mutate(formValues, {
      onSuccess: (data: any) => {
        setProgress(100);
        clearInterval(progressInterval);
        setShowConfirmation(false);
        setFormValues(null);
        form.reset();
        // Store the deposit reference from the server
        if (data.reference) {
          setDepositReference(data.reference);
        }
        toast({
          title: t("success"),
          description: t("deposit_initiated", {
            amount: formValues.amount,
            currency: formValues.currency,
            commission: (commissionRate * 100).toString(),
            final: data.amount.final
          }),
          duration: 5000,
        });
      },
      onError: (error: any) => {
        clearInterval(progressInterval);
        setProgress(0);
        setShowConfirmation(false);
        toast({
          variant: "destructive",
          title: t("error"),
          description: error.message || t("deposit_failed"),
          duration: 7000,
        });
      }
    });
  };

  // Memoize calculations
  const amount = React.useMemo(() =>
    Number(formValues?.amount || form.watch("amount") || 0),
    [formValues?.amount, form.watch("amount")]
  );

  const selectedCurrency = React.useMemo(() =>
    formValues?.currency || form.watch("currency"),
    [formValues?.currency, form.watch("currency")]
  );

  const commission = React.useMemo(() =>
    amount * commissionRate,
    [amount, commissionRate]
  );

  const finalAmount = React.useMemo(() =>
    amount - commission,
    [amount, commission]
  );

  // For SEK which isn't in CURRENCY_LIMITS
  const currencyInfo = React.useMemo(() => {
    if (selectedCurrency === "SEK") {
      return { symbol: 'kr', name: 'Swedish Krona', min: 100, max: 200000 };
    }
    return CURRENCY_LIMITS[selectedCurrency as keyof typeof CURRENCY_LIMITS];
  }, [selectedCurrency]);

  const processingTime = React.useMemo(() =>
    CURRENCY_PROCESSING[selectedCurrency as keyof typeof CURRENCY_PROCESSING],
    [selectedCurrency]
  );

  return (
    <TooltipProvider>
      <div className={className}>
        {showConfirmation ? (
          <Card className="p-6 space-y-6 border border-primary/10">
            <h3 className="text-lg font-medium">{t("confirm_deposit")}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">{t("amount")}:</p>
                <p className="font-medium">{currencyInfo?.symbol}{amount.toLocaleString()} {selectedCurrency}</p>

                <p className="text-muted-foreground">{t("commission")} ({commissionRate * 100}%):</p>
                <p className="font-medium text-red-500">- {currencyInfo?.symbol}{commission.toLocaleString()} {selectedCurrency}</p>

                <p className="text-muted-foreground">{t("final_amount")}:</p>
                <p className="font-medium">{currencyInfo?.symbol}{finalAmount.toLocaleString()} {selectedCurrency}</p>
              </div>

              <div className="space-y-4 mt-6">
                <h4 className="text-sm font-medium">{t("transaction_timeline")}</h4>
                <div className="space-y-4 text-sm">
                  <TimelineStep
                    number={1}
                    title={t("initiate_bank_transfer")}
                    description={t("send_amount_description", {
                      symbol: currencyInfo?.symbol,
                      amount: amount.toLocaleString(),
                      currency: selectedCurrency
                    })}
                    completed={depositMutation.isPending && progress > 30}
                  />
                  <TimelineStep
                    number={2}
                    title={t("processing_period")}
                    description={t("allow_days", { days: processingTime?.time })}
                    additionalInfo={`${processingTime?.note}\n${t("estimated_completion")}: ${getEstimatedCompletionDate(selectedCurrency as keyof typeof CURRENCY_PROCESSING)}`}
                    current={depositMutation.isPending && progress > 30 && progress < 90}
                  />
                  <TimelineStep
                    number={3}
                    title={t("account_credit")}
                    description={t("final_amount_credited", {
                      symbol: currencyInfo?.symbol,
                      amount: finalAmount.toLocaleString(),
                      currency: selectedCurrency
                    })}
                    completed={depositMutation.isPending && progress === 100}
                  />
                </div>
              </div>

              <Card className="p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-3 flex items-center justify-between">
                  {t("bank_transfer_details")}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("use_details_for_transfer")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("click_to_copy")}</p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("bank_name")}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">EvokeEssence Bank AG</span>
                      <CopyButton
                        text="EvokeEssence Bank AG"
                        label={t("bank_name")}
                        toast={toast}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IBAN:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono select-all">CH</span>
                      <CopyButton
                        text="CH"
                        label="IBAN"
                        toast={toast}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">BIC/SWIFT:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono select-all">EVOKCHZZ</span>
                      <CopyButton
                        text="EVOKCHZZ"
                        label="BIC/SWIFT"
                        toast={toast}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("reference")}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono select-all">
                        {depositReference || ""}
                      </span>
                      <CopyButton
                        text={depositReference || ""}
                        label={t("reference")}
                        toast={toast}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Alert>
                <AlertDescription className="space-y-2">
                  <p>{t("ensure_details_correct")}</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>{t("use_registered_account")}</li>
                    <li>{t("include_reference")}</li>
                    <li>{t("transfer_exact_amount")}</li>
                    <li>{t("international_fees_warning")}</li>
                    <li>{t("process_time", {
                      days: processingTime?.time,
                      currency: selectedCurrency,
                      note: processingTime?.note
                    })}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmation(false);
                  setFormValues(null);
                  if (onStepChange) onStepChange(0); // Back to first step
                }}
                disabled={depositMutation.isPending}
              >
                {t("back")}
              </Button>
              <Button
                onClick={confirmDeposit}
                disabled={depositMutation.isPending}
                className="flex-1"
              >
                {depositMutation.isPending ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    {t("processing")}
                  </>
                ) : t("confirm_deposit")}
              </Button>
            </div>

            {depositMutation.isPending && progress > 0 && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  {t("processing_deposit")} {progress}%
                </p>
              </div>
            )}
          </Card>
        ) : (
          // Initial deposit form view
          <Form {...form}>
            {isOffline && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("offline_warning")}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Alert className="mb-4">
                <AlertDescription>
                  {t("wire_transfer_instructions")}
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {t("amount")}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="p-4 max-w-xs">
                          <p>{t("enter_deposit_amount")}</p>
                          {currencyInfo && (
                            <div className="mt-2 space-y-1">
                              <p className="font-medium">{t("currency_limits")}:</p>
                              <ul className="text-sm space-y-1">
                                <li>{t("minimum")}: {currencyInfo.symbol}{currencyInfo.min.toLocaleString()}</li>
                                <li>{t("maximum")}: {currencyInfo.symbol}{currencyInfo.max.toLocaleString()}</li>
                              </ul>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          {...field}
                          className="pl-8"
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = value.split('.');
                            if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
                              return;
                            }
                            field.onChange(value);
                          }}
                        />
                        <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                    {currencyInfo && (
                      <FormDescription className="text-xs mt-1">
                        {t("accepted_range")}: {currencyInfo.symbol}{currencyInfo.min.toLocaleString()} - {currencyInfo.symbol}{currencyInfo.max.toLocaleString()}
                      </FormDescription>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {t("currency")}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="w-[400px] p-4">
                          <p>{t("select_currency")}</p>
                          <div className="mt-4">
                            <p className="font-medium mb-2">{t("currency_processing_times")}:</p>
                            <div className="space-y-2 text-sm">
                              {Object.entries(CURRENCY_PROCESSING).map(([currency, info]) => (
                                <div key={currency} className="flex flex-col gap-1 pb-2 border-b last:border-0">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {currency === "SEK" ? "Swedish Krona" : CURRENCY_LIMITS[currency as keyof typeof CURRENCY_LIMITS]?.name}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                      {info.time} {t("days")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{info.note}</span>
                                    <span>{info.estimatedArrival}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                              * {t("processing_times_vary")}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_currency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CURRENCY_LIMITS).map(([currency, info]) => (
                          <SelectItem key={currency} value={currency}>
                            <div className="flex items-center justify-between w-full">
                              <span>{info.name} ({currency})</span>
                              <span className="text-xs text-muted-foreground">
                                {t("est_arrival")}: {getEstimatedCompletionDate(currency as keyof typeof CURRENCY_PROCESSING)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="SEK">
                          <div className="flex items-center justify-between w-full">
                            <span>SEK (Swedish Krona)</span>
                            <span className="text-xs text-muted-foreground">
                              {t("est_arrival")}: {getEstimatedCompletionDate('SEK')}
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <FormDescription className="text-xs mt-1">
                      {processingTime?.note} • {t("est_completion")}: {getEstimatedCompletionDate(selectedCurrency as keyof typeof CURRENCY_PROCESSING)}
                    </FormDescription>
                  </FormItem>
                )}
              />

              {amount > 0 && (
                <Card className="p-4 space-y-2 bg-muted/50">
                  <div className="flex justify-between items-center text-sm">
                    <p>{t("commission_fee")} ({commissionRate * 100}%)</p>
                    <p className="text-muted-foreground">- {currencyInfo?.symbol}{commission.toFixed(2)} {selectedCurrency}</p>
                  </div>
                  <div className="flex justify-between items-center font-medium border-t pt-2">
                    <p>{t("final_amount")}</p>
                    <p>{currencyInfo?.symbol}{finalAmount.toFixed(2)} {selectedCurrency}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("commission_note", { rate: (commissionRate * 100).toString() })}
                  </p>
                </Card>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={depositMutation.isPending || isOffline || !form.formState.isValid}
              >
                {t("review_deposit")}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </TooltipProvider>
  );
}