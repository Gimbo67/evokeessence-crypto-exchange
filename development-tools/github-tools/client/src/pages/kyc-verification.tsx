import { useTranslations } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { ArrowRight, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function KYCVerificationPage() {
  const t = useTranslations();
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check for status or error in URL
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const error = params.get('error');

    if (status === 'submitted') {
      toast({
        title: t('verification_submitted'),
        description: t('verification_review_message'),
      });
    } else if (error) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t(`verification_${error}`, { fallback: t('verification_error_unknown') })
      });
    }

    // Clean up URL parameters
    if (status || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast, t]);

  const handleStartVerification = async () => {
    try {
      setIsRedirecting(true);
      localStorage.setItem('kycStartTime', new Date().toISOString());
      localStorage.setItem('kycStatus', 'started');

      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to SumSub WebSDK page with our app token
      window.location.href = 'https://in.sumsub.com/websdk/p/uni_Y3eJlldtCfNNEGMf';
    } catch (error) {
      console.error('Error starting verification:', error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('verification_start_error')
      });
      setIsRedirecting(false);
    }
  };

  // Calculate time remaining if verification is pending
  const getTimeRemaining = () => {
    const startTime = localStorage.getItem('kycStartTime');
    if (!startTime) return null;

    const start = new Date(startTime);
    const now = new Date();
    const hoursElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(24 - hoursElapsed, 0);

    return {
      hours: Math.floor(hoursRemaining),
      minutes: Math.floor((hoursRemaining % 1) * 60)
    };
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="container py-8 space-y-6">
      <motion.h1 
        className="text-3xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {t('kyc_verification')}
      </motion.h1>

      <AnimatePresence mode="wait">
        <motion.div
          key={user?.kyc_status || 'not_started'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('identity_verification')}</CardTitle>
              <CardDescription>{t('identity_verification_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!user?.kyc_status || user.kyc_status === 'not_started' ? (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-muted-foreground">
                    {t('kyc_verification_description')}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="p-4 border-dashed">
                        <h3 className="font-semibold mb-2">{t('required_documents')}</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• {t('valid_government_id')}</li>
                          <li>• {t('proof_of_address')}</li>
                          <li>• {t('selfie_photo')}</li>
                        </ul>
                      </Card>
                    </motion.div>
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="p-4 border-dashed">
                        <h3 className="font-semibold mb-2">{t('verification_benefits')}</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• {t('full_trading_access')}</li>
                          <li>• {t('higher_transaction_limits')}</li>
                          <li>• {t('enhanced_security')}</li>
                          <li>• {t('faster_withdrawals')}</li>
                        </ul>
                      </Card>
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button 
                      size="lg" 
                      onClick={handleStartVerification}
                      className="w-full sm:w-auto"
                      disabled={isRedirecting}
                    >
                      {isRedirecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('redirecting')}
                        </>
                      ) : (
                        <>
                          {t('start_verification')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : user.kyc_status === 'pending' ? (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">{t('verification_in_progress')}</span>
                  </div>

                  {timeRemaining && (
                    <motion.div 
                      className="bg-muted/50 p-4 rounded-lg"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('verification_time_estimate')}
                      </p>
                      <p className="text-2xl font-semibold">
                        {timeRemaining.hours}h {timeRemaining.minutes}m
                      </p>
                    </motion.div>
                  )}
                  <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <h3 className="font-medium">{t('verification_steps')}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('documents_submitted')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-yellow-500">
                        <Clock className="h-4 w-4" />
                        <span>{t('verification_review')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : user.kyc_status === 'approved' ? (
                <motion.div 
                  className="flex items-center gap-2 text-green-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{t('verification_approved')}</span>
                </motion.div>
              ) : (
                <motion.div 
                  className="flex items-center gap-2 text-red-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{t('verification_rejected')}</span>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}