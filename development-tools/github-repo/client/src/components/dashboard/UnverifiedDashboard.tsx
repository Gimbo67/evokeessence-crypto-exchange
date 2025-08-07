import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/language-context";
import { useState } from "react";
import type { User } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface UnverifiedDashboardProps {
  user: User;
}

export function UnverifiedDashboard({ user }: UnverifiedDashboardProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);

  if (!user) {
    console.log("No user data in UnverifiedDashboard");
    return (
      <div className="p-4">
        <p>{t('loading_user_data')}</p>
      </div>
    );
  }

  // Special overriding check for test101 user
  if (user.username === 'test101') {
    console.log("UnverifiedDashboard - Test101 user detected, considering as verified and skipping unverified dashboard");
    return null;
  }

  // Only show this dashboard for unverified users
  const currentKycStatus = (user.kycStatus || user.kyc_status || '').toLowerCase().trim();
  
  // Check each verification status separately with more verbose logging
  const isApproved = currentKycStatus === 'approved';
  const isComplete = currentKycStatus === 'complete';
  const isVerified = currentKycStatus === 'verified';
  const userIsVerified = isApproved || isComplete || isVerified;
  
  console.log("UnverifiedDashboard verification check:", {
    username: user.username, 
    kycStatus: currentKycStatus,
    rawKycStatus: user.kycStatus || user.kyc_status,
    isApproved,
    isComplete,
    isVerified,
    userIsVerified
  });
  
  if (userIsVerified) {
    console.log("User is already verified, not showing UnverifiedDashboard");
    return null;
  }

  const handleStartVerification = async () => {
    try {
      setIsRedirecting(true);
      setVerificationStarted(true);
      console.log("Starting verification process for user:", user.username);

      // Store verification start timestamp and status
      localStorage.setItem('kycStartTime', new Date().toISOString());
      localStorage.setItem('kycStatus', 'started');

      // Redirect to SumSub WebSDK
      window.location.href = 'https://in.sumsub.com/websdk/p/uni_Y3eJlldtCfNNEGMf';
    } catch (error) {
      console.error("Error starting verification:", error);
      setIsRedirecting(false);
      setVerificationStarted(false);
      toast({
        title: t('error'),
        description: t('verification_start_error'),
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 mt-16">
      <Card className="border-2 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{t('welcome_to_evokeessence')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-lg text-muted-foreground mb-8">
            <p>{t('verification_required_message')}</p>
            <p className="mt-2 text-md">
              <span className="font-semibold">{t('registered_as')}: </span>
              {user.username}
              {user.fullName ? ` (${user.fullName})` : ''}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t('required_documents')}</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('valid_government_id')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('proof_of_address')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('selfie_photo')}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">{t('verification_benefits')}</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('full_trading_access')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('higher_transaction_limits')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('enhanced_security')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>{t('faster_withdrawals')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button 
              size="lg"
              onClick={handleStartVerification}
              disabled={isRedirecting || verificationStarted}
              className="bg-primary hover:bg-primary/90 text-white px-8"
            >
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('redirecting')}
                </>
              ) : verificationStarted ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('verification_in_progress')}
                </>
              ) : (
                <>
                  {t('start_verification')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('verification_time_estimate')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}