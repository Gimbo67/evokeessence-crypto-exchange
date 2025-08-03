import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { post } from "@/lib/api-client";
import { useTranslations } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";

interface DisableTwoFactorProps {
  onComplete?: () => void;
  className?: string;
}

export function DisableTwoFactor({ onComplete, className }: DisableTwoFactorProps) {
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { checkAuthStatus } = useAuth();

  // Disable 2FA mutation using JSON-guaranteed endpoint
  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      try {
        console.log('Starting 2FA disable request using JSON-guaranteed endpoint...');
        
        // Use our bypass endpoint to avoid Vite middleware issues
        const response = await fetch('/bypass/2fa/disable-json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Request': 'true'
          },
          credentials: 'include',
          body: JSON.stringify({ token: code })
        });
        
        console.log('2FA disable response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('twofa_disable_failed'));
        }
        
        const data = await response.json();
        console.log('2FA disable response data:', data);
        
        if (!data || !data.success) {
          throw new Error(t('invalid_server_response'));
        }
        
        return data;
      } catch (error) {
        console.error('2FA Disable Error:', error);
        
        // Enhanced error logging
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          if (error.message.includes('Invalid verification code')) {
            throw new Error(t('invalid_verification_code'));
          }
          
          throw error;
        }
        
        throw new Error(t('twofa_disable_failed'));
      }
    },
    onSuccess: async (data) => {
      console.log('2FA disable success, data:', data);
      
      // Invalidate all relevant query caches to refresh 2FA status
      console.log('Invalidating cache after 2FA disable');
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Force refresh auth status
      try {
        await checkAuthStatus();
      } catch (error) {
        console.error('Error updating auth status after disabling 2FA:', error);
      }
      
      // Show success notification
      toast({
        title: t("2fa_disabled"),
        description: t("2fa_disabled_description")
      });
      
      // Call completion callback if provided with small delay to ensure all UI updates
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 100);
    },
    onError: (error: Error) => {
      console.error('2FA disable mutation error:', error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: error.message
      });
    }
  });

  const handleDisable = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    if (verificationCode.length === 6) {
      disableMutation.mutate(verificationCode);
    } else {
      toast({
        variant: "destructive",
        title: t('invalid_code'),
        description: t('enter_6_digit_code')
      });
    }
  };

  const handleCancel = () => {
    if (isConfirming) {
      setIsConfirming(false);
      setVerificationCode("");
      return;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" /> 
          {t('disable_2fa')}
        </CardTitle>
        <CardDescription>
          {t('disable_2fa_description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!isConfirming ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>{t('warning')}</AlertTitle>
              <AlertDescription>
                {t('disable_2fa_warning')}
              </AlertDescription>
            </Alert>
            
            <p className="text-sm text-muted-foreground">
              {t("2fa_security_recommendation")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="default">
              <AlertTitle>{t('verification_required')}</AlertTitle>
              <AlertDescription>
                {t('enter_6_digit_confirmation')}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('verification_code_entry')}</h3>
              <InputOTP 
                value={verificationCode} 
                onChange={(value: string) => setVerificationCode(value)}
                maxLength={6}
              />
              <div className="mt-2">
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      onValueChange={(value) => {
                        const newCode = verificationCode.split('');
                        newCode[i] = value;
                        setVerificationCode(newCode.join(''));
                      }}
                    />
                  ))}
                </InputOTPGroup>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {isConfirming && (
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={disableMutation.isPending}
          >
            {t('back')}
          </Button>
        )}
        
        <Button 
          variant={isConfirming ? "destructive" : "default"}
          onClick={handleDisable}
          disabled={isConfirming ? verificationCode.length !== 6 || disableMutation.isPending : disableMutation.isPending}
          className={isConfirming ? "" : "ml-auto"}
        >
          {disableMutation.isPending ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              {t('disabling')}
            </>
          ) : (
            <>
              {isConfirming ? t('confirm_disable') : t('disable_2fa')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}