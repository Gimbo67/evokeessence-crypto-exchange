import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BankDetailsProps {
  name: string;
  iban: string;
  bic: string;
  address: string;
  reference?: string;
  className?: string;
}

export function BankDetails({ name, iban, bic, address, reference, className }: BankDetailsProps) {
  const t = useTranslations();
  const { toast } = useToast();

  const copyToClipboard = async (text: string, messageKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: t(`copy_success`, { field: t(messageKey.toLowerCase()) }),
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        description: t("copy_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "space-y-3 border rounded-lg p-3 bg-muted/30",
          "transition-all duration-200 hover:bg-accent/5 hover:border-accent",
          className
        )}
        role="region"
        aria-label={t("bank_details")}
      >
        {[
          { key: 'bank_name', value: name },
          { key: 'iban', value: iban },
          { key: 'bic', value: bic },
          { key: 'address', value: address },
          ...(reference ? [{ key: 'reference', value: reference }] : [])
        ].map(({ key, value }) => (
          <div key={key} className="group relative">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <p className="font-medium">{t(key)}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info 
                      className="h-4 w-4 text-muted-foreground cursor-help opacity-0 group-hover:opacity-100 transition-opacity" 
                      aria-hidden="true"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(`${key}_tooltip`)}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(value, key)}
                aria-label={t("copy_to_clipboard")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p 
              className="text-sm font-mono text-muted-foreground select-all"
              role="textbox"
              aria-label={`${t(key)}: ${value}`}
            >
              {value}
            </p>
            {key === 'reference' && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {t("reference_note")}
              </p>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}