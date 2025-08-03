import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/lib/language-context';

export function useClipboard() {
  const [copying, setCopying] = useState(false);
  const { toast } = useToast();
  const t = useTranslations();

  const copyToClipboard = useCallback(async (text: string, description?: string) => {
    if (copying) return;

    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast({
        description: description || t('copy_success'),
        duration: 2000,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: t('copy_error'),
      });
    } finally {
      setCopying(false);
    }
  }, [copying, toast, t]);

  return { copyToClipboard, copying };
}