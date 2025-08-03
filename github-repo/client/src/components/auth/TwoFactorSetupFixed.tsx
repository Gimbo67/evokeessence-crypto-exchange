import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, CheckCircle, Smartphone, QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useClipboard } from "@/hooks/use-clipboard";
import { useTranslations } from "@/lib/language-context";
import { useAuth } from "@/hooks/use-auth";

interface TwoFactorSetupProps {
  onComplete?: () => void;
  className?: string;
}

export function TwoFactorSetup({ onComplete, className }: TwoFactorSetupProps) {
  const [secret, setSecret] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'initial' | 'verify' | 'backupCodes' | 'complete'>('initial');
  const [userId, setUserId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { copyToClipboard, copying } = useClipboard();
  const t = useTranslations();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get user ID on component mount
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  // Define error info type
interface ErrorInfo {
  error?: string;
  message?: string;
  details?: string;
}

// Initialize 2FA setup
const setupMutation = useMutation({
  mutationFn: async () => {
    try {
      console.log('Starting 2FA setup request using direct API endpoint...');
      
      // Use bypass endpoint to avoid Vite middleware issues
      const response = await fetch('/bypass/2fa/setup-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Request': 'true'
        },
        credentials: 'include', // Include cookies for session authentication
        body: JSON.stringify({
          userId: userId || undefined, // Include userId if available
          username: user?.username || undefined, // Include username if available
        }),
      });
      
      console.log('2FA setup response status:', response.status);
      
      // Log response headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('2FA setup response headers:', headers);
      
      // Try to parse as JSON directly to improve error handling
      let data;
      try {
        data = await response.json();
        console.log('2FA setup response data:', data);
      } catch (e) {
        console.error('Failed to parse response as JSON', e);
        const errorText = await response.text();
        console.error('Raw response:', errorText);
        throw new Error(t('invalid_server_response'));
      }
      
      // Check if the response contains an error
      if (!response.ok || data.error) {
        const errorMessage = data.message || data.error || t('server_error');
        throw new Error(errorMessage);
      }
      
      // Validate the response format
      if (!data || !data.secret || !data.qrCode) {
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
        console.log('Starting 2FA verification request using direct endpoint...');
        
        // Use bypass endpoint to avoid Vite middleware issues
        const response = await fetch('/bypass/2fa/validate-json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Request': 'true'
          },
          credentials: 'include', // Important for session authentication
          body: JSON.stringify({ 
            token,
            userId: userId || undefined, // Include userId if available
            username: user?.username || undefined, // Include username if available
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
        
        // Check content type first to avoid Response body already used error
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('text/html')) {
          // Handle HTML response before trying to parse JSON
          const htmlResponse = await response.text();
          console.error('HTML response received:', htmlResponse.substring(0, 200) + '...');
          throw new Error(t('html_response_error') || 'Unexpected HTML response from server');
        }
        
        // Try to parse response as JSON directly
        let data;
        try {
          data = await response.json();
          console.log('Parsed 2FA verification response data:', data);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          // If JSON parsing fails, try to get the response text
          try {
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            throw new Error(`${t('invalid_response_format')}: ${responseText.substring(0, 100)}...`);
          } catch (textError) {
            console.error('Failed to get response text:', textError);
            throw new Error(t('invalid_response_format'));
          }
        }
        
        // Check for error status from server - Standardized to use success: false
        if (!response.ok || data.success === false || data.error) {
          const errorMessage = data.error || data.message || t('server_error');
          console.error('Server returned error response:', errorMessage);
          throw new Error(errorMessage);
        }
        
        // Add auth status refresh after successful verification
        console.log('Successful 2FA verification, refreshing auth status...');
        try {
          // This will update the global state with the new 2FA status
          await queryClient.invalidateQueries({ queryKey: ['user'] });
        } catch (refreshError) {
          console.error('Error refreshing user data after 2FA verification:', refreshError);
          // Continue with the process even if refresh fails
        }
        
        // We now use a consistent success: true format across all responses
        if (data.success && Array.isArray(data.backupCodes)) {
          return data;
        }
        
        // Legacy format support - For the bypass route supporting older status format
        if (data.status === 'success' && Array.isArray(data.backupCodes)) {
          // Reformat to new standard format
          console.log('Legacy response format detected, normalizing...');
          data.success = true;
          return data;
        }
        
        // Ensure backup codes are in the correct format
        let codes = data.backupCodes;
        
        console.log('Received backup codes format:', {
          type: typeof codes,
          isArray: Array.isArray(codes),
          value: codes
        });
        
        if (!Array.isArray(codes)) {
          // Try to parse if it's a string
          try {
            if (typeof codes === 'string') {
              // Try standard JSON parse first
              try {
                codes = JSON.parse(codes);
                console.log('Successfully parsed backup codes as JSON:', codes);
              } catch (jsonError) {
                console.error('Failed standard JSON parse:', jsonError);
                
                // If JSON parsing fails, try handling common string formats
                if (codes.includes(',')) {
                  // Handle comma-separated strings
                  codes = codes.split(',').map((code: string) => code.trim());
                  console.log('Parsed backup codes as comma-separated string:', codes);
                } else if (codes.includes('\n') || codes.includes('\r')) {
                  // Handle newline-separated strings
                  codes = codes.split(/[\r\n]+/).map((code: string) => code.trim()).filter(Boolean);
                  console.log('Parsed backup codes as newline-separated string:', codes);
                } else {
                  // Try to extract XXXX-XXXX patterns
                  const matches = codes.match(/[A-Z0-9]{4}-[A-Z0-9]{4}/gi);
                  if (matches && matches.length > 0) {
                    codes = matches;
                    console.log('Extracted backup codes using regex:', codes);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse backup codes:', e);
          }
          
          // If still not an array, or empty array, create a fallback
          if (!Array.isArray(codes) || codes.length === 0) {
            console.error('Could not parse backup codes into a valid array. Original data:', data);
            
            // Throw a clear error to show the user
            throw new Error(t('invalid_backup_codes_format'));
          }
          
          // Update the response with parsed codes
          data.backupCodes = codes;
          console.log('Final parsed backup codes:', data.backupCodes);
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
      console.log('Initiating 2FA verification with token:', token, 'for userId:', userId);
      verifyMutation.mutate(token);
    } else {
      toast({
        variant: "destructive",
        title: t('invalid_code'),
        description: t('enter_6_digit_code')
      });
    }
  };

  const handleComplete = async () => {
    setStep('complete');
    
    // Invalidate all related queries to ensure fresh data
    try {
      console.log('2FA setup complete, refreshing data...');
      await queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      console.log('Cache invalidation complete');
    } catch (error) {
      console.error('Error refreshing data after 2FA setup:', error);
      // Continue with the process even if refresh fails
    }
    
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
              
              <div className="flex flex-col gap-6 items-center mb-6">
                {/* QR Code Container */}
                <div className="border rounded-md p-4 bg-white shrink-0 mx-auto">
                  {qrCode ? (
                    <div dangerouslySetInnerHTML={{ __html: qrCode }} className="h-48 w-48" />
                  ) : (
                    <div className="h-48 w-48 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
                
                {/* Instructions */}
                <div className="w-full space-y-4">
                  <div className="border rounded-md p-3 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('scan_qr_instruction')}
                    </p>
                    <div>
                      <p className="text-sm mb-1 font-medium">Secret Key:</p>
                      <p className="font-mono text-xs bg-muted p-2 rounded break-all select-all">{secret}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">3. {t('verification_code_prompt')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('enter_code_instruction')}
              </p>
              
              <div>
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