import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, CheckCircle, Smartphone, QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useClipboard } from "@/hooks/use-clipboard";
import { post } from "@/lib/api-client";
import { useTranslations } from "@/lib/language-context";

interface TwoFactorSetupProps {
  onComplete?: () => void;
  className?: string;
}

export function TwoFactorSetup({ onComplete, className }: TwoFactorSetupProps) {
  const [secret, setSecret] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState<string>("");
  const [step, setStep] = useState<'initial' | 'verify' | 'backupCodes' | 'complete'>('initial');
  const { toast } = useToast();
  const { copyToClipboard, copying } = useClipboard();
  const t = useTranslations();

  // Initialize 2FA setup
  const setupMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('Starting 2FA setup request...');
        
        // Instead of using the post function, use the fetch API directly for more control
        const response = await fetch('/api/2fa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Request': 'true',
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          credentials: 'include', // Include cookies for session authentication
          body: JSON.stringify({}), // Empty object as body
        });
        
        console.log('2FA setup response status:', response.status);
        
        // Log response headers for debugging
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('2FA setup response headers:', headers);
        
        // Check for non-JSON responses
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('text/html')) {
          console.error('Received HTML response instead of JSON');
          throw new Error(t('session_expired_error'));
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorInfo = { error: 'Unknown server error' };
          
          try {
            errorInfo = JSON.parse(errorText);
          } catch (e) {
            console.error('Failed to parse error response:', errorText);
          }
          
          console.error('Server error response:', errorInfo);
          throw new Error(errorInfo.message || errorInfo.error || t('server_error'));
        }
        
        // Parse the JSON response
        const data = await response.json();
        console.log('2FA setup response data:', data);
        
        if (!data) {
          throw new Error(t('server_error'));
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (!data.secret || !data.qrCode) {
          throw new Error(t('invalid_server_response'));
        }
        
        return data;
      } catch (error) {
        console.error('2FA Setup Error:', error);
        
        // Enhanced error logging and handling
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          // Improved session expiration detection
          if (
            error.message.includes('HTML') || 
            error.message.includes('status code 401') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('Not authenticated') ||
            error.message.includes('session')
          ) {
            throw new Error(t('session_expired_error'));
          }
          
          throw error;
        }
        
        throw new Error(t('unknown_setup_error'));
      }
    },
    onSuccess: (data) => {
      console.log('2FA setup success, processing data:', data);
      if (!data || !data.secret || !data.qrCode) {
        console.error('Invalid 2FA setup response:', data);
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('invalid_server_response')
        });
        return;
      }
      
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep('verify');
      
      toast({
        title: t('twofa_setup_started'),
        description: t('scan_qr_code_prompt')
      });
    },
    onError: (error: Error) => {
      console.error('2FA setup mutation error:', error);
      toast({
        variant: "destructive",
        title: t('twofa_setup_error'),
        description: error.message
      });
    }
  });

  // Verify token during setup
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      try {
        console.log('Starting 2FA verification request...');
        
        // Use fetch directly for verification like we did for setup
        const response = await fetch('/api/2fa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Request': 'true',
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          credentials: 'include', // Important for session authentication
          body: JSON.stringify({ 
            token, 
            secret,
            timestamp: new Date().getTime() // Add timestamp to prevent caching
          })
        });
        
        console.log('2FA verification response status:', response.status);
        
        // Log headers for debugging
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('2FA verification response headers:', headers);
        
        // Check for non-JSON responses that might indicate session issues
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('text/html')) {
          console.error('Received HTML response instead of JSON');
          throw new Error(t('session_expired_error'));
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorInfo = { error: 'Unknown server error' };
          
          try {
            errorInfo = JSON.parse(errorText);
          } catch (e) {
            console.error('Failed to parse error response:', errorText);
          }
          
          console.error('Server error response:', errorInfo);
          throw new Error(errorInfo.message || errorInfo.error || t('server_error'));
        }
        
        // Parse the JSON response
        const data = await response.json();
        console.log('2FA verification response data:', data);
        
        if (!data) {
          throw new Error(t('server_error'));
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (!data.success || !data.backupCodes) {
          throw new Error(t('invalid_server_response'));
        }
        
        // Ensure backup codes are in the correct format
        if (!Array.isArray(data.backupCodes)) {
          // Try to parse if it's a string
          try {
            if (typeof data.backupCodes === 'string') {
              data.backupCodes = JSON.parse(data.backupCodes);
            }
          } catch (e) {
            console.error('Failed to parse backup codes:', e);
          }
          
          // If still not an array, throw an error
          if (!Array.isArray(data.backupCodes)) {
            throw new Error(t('invalid_backup_codes'));
          }
        }
        
        return data;
      } catch (error) {
        console.error('2FA Verification Error:', error);
        
        // Enhanced error logging and handling
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          // Improved session expiration detection
          if (
            error.message.includes('HTML') || 
            error.message.includes('status code 401') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('Not authenticated') ||
            error.message.includes('session')
          ) {
            throw new Error(t('session_expired_error'));
          }
          
          if (error.message.includes('Invalid verification code')) {
            throw new Error(t('invalid_verification_code'));
          }
          
          throw error;
        }
        
        throw new Error(t('unknown_verify_error'));
      }
    },
    onSuccess: (data) => {
      console.log('2FA verification success, processing data:', data);
      if (!data || !data.backupCodes || !Array.isArray(data.backupCodes)) {
        console.error('Invalid 2FA verification response:', data);
        toast({
          variant: "destructive",
          title: t('error'),
          description: t('invalid_server_response')
        });
        return;
      }
      
      setBackupCodes(data.backupCodes || []);
      setStep('backupCodes');
      
      toast({
        title: t('verification_successful'),
        description: t('twofa_verified_save_codes'),
        variant: "default"
      });
    },
    onError: (error: Error) => {
      console.error('2FA verification mutation error:', error);
      toast({
        variant: "destructive",
        title: t('verification_failed'),
        description: error.message
      });
    }
  });

  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (token.length === 6) {
      verifyMutation.mutate(token);
    } else {
      toast({
        variant: "destructive",
        title: t('invalid_code'),
        description: t('enter_6_digit_code')
      });
    }
  };

  const handleComplete = () => {
    setStep('complete');
    toast({
      title: t('twofa_enabled'),
      description: t('twofa_setup_success')
    });
    
    // Call the callback if provided
    if (onComplete) {
      onComplete();
    }
  };

  const copySecret = async () => {
    await copyToClipboard(secret, t('secret_key_copied'));
  };

  const copyBackupCodes = async () => {
    await copyToClipboard(backupCodes.join('\n'), t('backup_codes_copied'));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> 
          {t('two_factor_authentication')}
        </CardTitle>
        <CardDescription>
          {t('twofa_setup_description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {step === 'initial' && (
          <div className="space-y-4">
            <Alert variant="default" className="bg-amber-50 border-amber-100 text-amber-800">
              <AlertTitle className="text-amber-800 font-medium">{t('enhance_security')}</AlertTitle>
              <AlertDescription className="text-amber-700">
                {t('twofa_security_description')}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{t('how_it_works')}:</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>{t('setup_authenticator_app')}</li>
                <li>{t('scan_qr_code')}</li>
                <li>{t('verify_with_code')}</li>
                <li>{t('save_backup_codes')}</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">1. {t('install_authenticator_app')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('install_authenticator_instruction')}
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex justify-between">
                <span>2. {t('scan_qr_heading')}</span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copySecret}>
                  {copying ? (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {t('copy_secret')}
                </Button>
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative border rounded-md p-1 bg-white">
                  {qrCode ? (
                    <div dangerouslySetInnerHTML={{ __html: qrCode }} className="h-40 w-40" />
                  ) : (
                    <div className="h-40 w-40 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('scan_qr_instruction')}
                  </p>
                  <p className="font-mono text-xs bg-muted p-2 rounded break-all select-all">{secret}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">3. {t('verification_code_prompt')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('enter_code_instruction')}
              </p>
              
              <InputOTP 
                value={token} 
                onChange={(value: string) => setToken(value)}
                maxLength={6}
              />
              <div className="mt-2">
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      onValueChange={(value) => {
                        const newToken = token.split('');
                        newToken[i] = value;
                        setToken(newToken.join(''));
                      }}
                    />
                  ))}
                </InputOTPGroup>
              </div>
            </div>
          </div>
        )}

        {step === 'backupCodes' && (
          <div className="space-y-6">
            <Alert variant="default" className="bg-amber-50 border-amber-100 text-amber-800">
              <AlertTitle className="flex items-center gap-2 text-amber-800 font-medium">
                <Shield className="h-4 w-4 text-amber-600" />
                {t('save_backup_codes_title')}
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                {t('backup_codes_description')}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t('backup_codes')}</h3>
                <Button variant="outline" size="sm" className="h-7" onClick={copyBackupCodes}>
                  {copying ? (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {t('copy_all')}
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="font-mono text-xs">{code}</code>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                {t('keep_codes_safe')}
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{t('twofa_enabled')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('twofa_setup_complete_message')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        {step === 'initial' && (
          <Button 
            onClick={handleStartSetup} 
            className="w-full"
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                {t('setting_up')}
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                {t('set_up_2fa')}
              </>
            )}
          </Button>
        )}

        {step === 'verify' && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => setStep('initial')}
              className="sm:flex-1"
              disabled={verifyMutation.isPending}
            >
              {t('back')}
            </Button>
            <Button 
              onClick={handleVerify}
              className="sm:flex-1"
              disabled={token.length !== 6 || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  {t('verifying')}
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  {t('verify_code')}
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'backupCodes' && (
          <Button 
            onClick={handleComplete} 
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('complete_setup')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}