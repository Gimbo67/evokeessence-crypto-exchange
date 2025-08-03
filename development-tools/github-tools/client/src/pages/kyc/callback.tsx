import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/lib/language-context";
import { Loader2 } from "lucide-react";

export default function KYCCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const t = useTranslations();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the status from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const reviewResult = urlParams.get('reviewResult');
        const error = urlParams.get('error');

        console.log('KYC callback received:', {
          status,
          reviewResult,
          error,
          timestamp: new Date().toISOString()
        });

        // If there's an error, handle it first
        if (error) {
          console.error('KYC verification error:', error);
          toast({
            variant: "destructive",
            title: t('verification_error'),
            description: t(`verification_error_${error}`, { fallback: t('verification_error_unknown') })
          });
          setLocation('/kyc-verification');
          return;
        }

        // Invalidate user query to refresh KYC status
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });

        if (status === 'completed' && reviewResult === 'GREEN') {
          console.log('KYC verification approved, redirecting to verified dashboard');
          toast({
            title: t('verification_approved'),
            description: t('verification_approved_message'),
          });
          // Clear the KYC start time from localStorage
          localStorage.removeItem('kycStartTime');
          localStorage.removeItem('kycStatus');
        } else if (status === 'completed' && reviewResult === 'RED') {
          console.log('KYC verification rejected');
          toast({
            variant: "destructive",
            title: t('verification_rejected'),
            description: t('verification_rejected_message'),
          });
          localStorage.removeItem('kycStartTime');
          localStorage.removeItem('kycStatus');
        } else {
          console.log('KYC verification pending');
          toast({
            title: t('verification_submitted'),
            description: t('verification_review_message'),
          });
        }

        // Redirect to dashboard
        setLocation('/dashboard');
      } catch (error) {
        console.error('Error handling KYC callback:', error);
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('verification_error'),
        });
        setLocation('/kyc-verification');
      }
    };

    handleCallback();
  }, [setLocation, toast, t, queryClient]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">{t('processing_verification')}</p>
    </div>
  );
}