import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useTranslations } from "@/lib/language-context";
import { useEffect, useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SumsubVerificationProps {
  redirectUrl?: string;
}

export function SumsubVerification({ redirectUrl }: SumsubVerificationProps) {
  const { toast } = useToast();
  const { user, refetch } = useUser();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [useEmbeddedSDK, setUseEmbeddedSDK] = useState(true);

  useEffect(() => {
    // Check if we need to redirect to a specific URL after verification completion
    const isApproved = user?.kycStatus === 'approved' || user?.kyc_status === 'approved';
    if (redirectUrl && isApproved) {
      console.log('KYC approved, redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    }
  }, [redirectUrl, user?.kycStatus, user?.kyc_status]);

  // Load SumSub WebSDK script
  useEffect(() => {
    if (!useEmbeddedSDK) return;

    const script = document.createElement('script');
    script.src = 'https://api.sumsub.com/idensic/static/js/app.js';
    script.async = true;
    script.onload = () => {
      console.log('[SumSub WebSDK] Script loaded successfully');
    };
    script.onerror = () => {
      console.error('[SumSub WebSDK] Failed to load script');
      toast({
        title: t("error"),
        description: "Failed to load verification component. Please refresh the page.",
        variant: "destructive"
      });
    };
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch (error) {
        // Script might have already been removed
      }
    };
  }, [useEmbeddedSDK, t, toast]);

  // Function to get access token from backend
  const getAccessToken = async () => {
    try {
      const response = await fetch('/api/kyc/sumsub/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get access token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('[SumSub] Error getting access token:', error);
      throw error;
    }
  };

  // Initialize SumSub WebSDK
  const initializeSumSubSDK = async () => {
    try {
      if (!user || !user.id) {
        throw new Error('User not authenticated');
      }

      setIsLoading(true);
      setVerificationStatus('in_progress');

      // Get access token
      const token = await getAccessToken();
      setAccessToken(token);

      // Initialize WebSDK
      if (!(window as any).snsWebSdk) {
        throw new Error('SumSub WebSDK not loaded');
      }

      const snsWebSdk = (window as any).snsWebSdk;
      
      const instance = snsWebSdk.init(
        token,
        // Token refresh callback
        async () => {
          console.log('[SumSub WebSDK] Refreshing token...');
          return await getAccessToken();
        }
      )
      .withConf({
        lang: 'en',
        email: user.email,
        phone: user.phoneNumber,
        country: user.countryOfResidence,
        // Add theme customization
        theme: {
          palette: {
            primary: '#0ea5e9',
            secondary: '#64748b'
          }
        }
      })
      .on('onError', (error: any) => {
        console.error('[SumSub WebSDK] Error:', error);
        setVerificationStatus('failed');
        toast({
          title: t("error"),
          description: "Verification failed. Please try again.",
          variant: "destructive"
        });
      })
      .onMessage((type: string, payload: any) => {
        console.log('[SumSub WebSDK] Message:', type, payload);
        
        switch (type) {
          case 'idCheck.onInitialized':
            console.log('[SumSub WebSDK] Initialized');
            setIsLoading(false);
            break;
          case 'idCheck.onApplicantLoaded':
            console.log('[SumSub WebSDK] Applicant loaded');
            break;
          case 'idCheck.onApplicantSubmitted':
            console.log('[SumSub WebSDK] Application submitted');
            setVerificationStatus('completed');
            // Poll for status update
            setTimeout(() => {
              refetch();
            }, 2000);
            break;
          case 'idCheck.onApplicantReviewed':
            console.log('[SumSub WebSDK] Review completed:', payload);
            setVerificationStatus('completed');
            // Refresh user data
            refetch();
            break;
          case 'idCheck.onError':
            console.error('[SumSub WebSDK] Verification error:', payload);
            setVerificationStatus('failed');
            break;
        }
      })
      .build();

      setSdkInstance(instance);

      // Launch the SDK
      if (containerRef.current) {
        instance.launch('#sumsub-websdk-container');
      }

    } catch (error) {
      console.error('[SumSub] Error initializing WebSDK:', error);
      setIsLoading(false);
      setVerificationStatus('failed');
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Failed to initialize verification. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to redirect to SumSub verification URL (fallback method)
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

  // Cleanup function
  useEffect(() => {
    return () => {
      if (sdkInstance) {
        try {
          sdkInstance.destroy();
        } catch (error) {
          console.error('[SumSub WebSDK] Error destroying instance:', error);
        }
      }
    };
  }, [sdkInstance]);

  // Current KYC status
  const kycStatus = user?.kycStatus || user?.kyc_status || 'not_started';

  // Render status icon
  const renderStatusIcon = () => {
    switch (kycStatus) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Render verification status
  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'in_progress':
        return (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Verification in progress. Please complete all required steps.
            </AlertDescription>
          </Alert>
        );
      case 'completed':
        return (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Verification submitted successfully. You will be notified once the review is complete.
            </AlertDescription>
          </Alert>
        );
      case 'failed':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Verification failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  // If using embedded SDK and verification is in progress, show the container
  if (useEmbeddedSDK && verificationStatus === 'in_progress') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {renderStatusIcon()}
              {t("identity_verification")}
            </CardTitle>
            <CardDescription>
              {t("identity_verification_description")}
            </CardDescription>
          </CardHeader>
        </Card>
        
        {renderVerificationStatus()}
        
        <div className="mt-4 bg-white border rounded-lg p-4 min-h-[600px]">
          <div id="sumsub-websdk-container" ref={containerRef} className="w-full h-full"></div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {renderStatusIcon()}
          {t("identity_verification")}
        </CardTitle>
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
        
        {renderVerificationStatus()}
        
        {kycStatus === 'pending' && (
          <Alert className="mt-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t("verification_pending")}
            </AlertDescription>
          </Alert>
        )}
        
        {kycStatus === 'rejected' && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("verification_rejected")}
            </AlertDescription>
          </Alert>
        )}
        
        {kycStatus === 'approved' && (
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              {t("verification_approved")}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button 
          className="w-full" 
          onClick={() => {
            setUseEmbeddedSDK(true);
            initializeSumSubSDK();
          }}
          disabled={kycStatus === 'pending' || kycStatus === 'approved' || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("loading")}
            </>
          ) : kycStatus === 'pending' ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              {t("verification_in_progress")}
            </>
          ) : kycStatus === 'approved' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("verification_approved")}
            </>
          ) : (
            t("start_verification")
          )}
        </Button>
        
        {!useEmbeddedSDK && kycStatus !== 'approved' && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleRedirectToSumSub}
            disabled={kycStatus === 'pending'}
          >
            {t("use_external_verification")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default SumsubVerification;