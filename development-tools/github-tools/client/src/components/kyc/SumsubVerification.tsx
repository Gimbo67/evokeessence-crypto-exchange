import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useTranslations } from '@/lib/language-context';
import { Loader2 } from 'lucide-react';

interface SumsubVerificationProps {
  redirectUrl?: string;
}

export function SumsubVerification({ redirectUrl }: SumsubVerificationProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const t = useTranslations();

  useEffect(() => {
    // Check if we need to redirect to a specific URL after verification completion
    const isApproved = user?.kycStatus === 'approved' || user?.kyc_status === 'approved';
    if (redirectUrl && isApproved) {
      console.log('KYC approved, redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [redirectUrl, user?.kycStatus, user?.kyc_status]);

  // Function to redirect to SumSub verification URL
  const handleRedirectToSumSub = async () => {
    try {
      console.log('Initiating SumSub verification redirect...');

      // Check if we have a user first
      if (!user || !user.id) {
        console.error('No user data available for KYC verification');
        toast({
          title: t("auth_error"),
          description: t("auth_error_description"),
          variant: "destructive"
        });

        setTimeout(() => {
          window.location.href = '/auth?next=/dashboard';
        }, 1500);
        return;
      }

      // Store verification start timestamp
      localStorage.setItem('kycStartTime', new Date().toISOString());
      localStorage.setItem('kycStatus', 'started');

      // Redirect to SumSub WebSDK
      window.location.href = 'https://in.sumsub.com/websdk/p/uni_Y3eJlldtCfNNEGMf';
    } catch (error) {
      console.error('Error redirecting to SumSub:', error);
      toast({
        title: t("verification_error"),
        description: t("verification_redirect_error"),
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t("identity_verification")}</CardTitle>
        <CardDescription>
          {t("identity_verification_description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          {t("verification_process_description")}
        </p>
        <p className="mb-4">
          {t("verification_documents_required")}
        </p>
        {(user?.kycStatus === 'pending' || user?.kyc_status === 'pending') && (
          <p className="text-amber-600 font-medium">
            {t("verification_pending")}
          </p>
        )}
        {(user?.kycStatus === 'rejected' || user?.kyc_status === 'rejected') && (
          <p className="text-red-600 font-medium">
            {t("verification_rejected")}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleRedirectToSumSub}
          disabled={user?.kycStatus === 'pending' || user?.kyc_status === 'pending'}
        >
          {(user?.kycStatus === 'pending' || user?.kyc_status === 'pending') ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("verification_in_progress")}
            </>
          ) : t("start_verification")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SumsubVerification;