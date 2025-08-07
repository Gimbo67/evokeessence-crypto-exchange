import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useClipboard } from '@/hooks/use-clipboard';
import { useTranslations } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface TwoFactorSetupBypassProps {
  userId: number;
  onComplete?: () => void;
}

export function TwoFactorSetupBypass({ userId, onComplete }: TwoFactorSetupBypassProps) {
  const [secret, setSecret] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'initial' | 'verify' | 'backupCodes' | 'complete'>('initial');
  
  const { toast } = useToast();
  const { copyToClipboard, copying } = useClipboard();
  const t = useTranslations();

  // Initialize 2FA setup using the bypass route
  const setupMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('Starting 2FA setup request using bypass route...');
        
        // Use the bypass route which is designed specifically for testing
        const response = await fetch('/bypass/2fa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ userId }), // Pass userId explicitly
        });
        
        console.log('2FA setup response status:', response.status);
        
        // Parse the JSON response
        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.error || 'Failed to setup 2FA');
        }
        
        return {
          secret: data.secret,
          qrCode: data.qrCode,
          userId: data.userId || userId
        };
      } catch (error) {
        console.error('Error in 2FA setup:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep('verify');
    },
    onError: (error: Error) => {
      console.error('2FA Setup Error:', error);
      toast({
        title: t('error'),
        description: error.message || t('two_factor_setup_error'),
        variant: 'destructive'
      });
    }
  });

  // Verify the token and complete setup
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      try {
        console.log('Verifying 2FA token using bypass route...');
        
        // Use the bypass route for verification
        const response = await fetch('/bypass/2fa/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ token, userId })
        });
        
        console.log('2FA verification response status:', response.status);
        
        // Parse the JSON response
        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.error || 'Failed to verify 2FA token');
        }
        
        return {
          success: true,
          backupCodes: data.backupCodes || []
        };
      } catch (error) {
        console.error('Error in 2FA verification:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backupCodes');
      toast({
        title: t('success'),
        description: t('two_factor_verification_success'),
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      console.error('2FA Verification Error:', error);
      toast({
        title: t('error'),
        description: error.message || t('two_factor_verification_error'),
        variant: 'destructive'
      });
    }
  });

  const handleVerify = () => {
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      toast({
        title: t('error'),
        description: t('two_factor_invalid_token'),
        variant: 'destructive'
      });
      return;
    }
    
    verifyMutation.mutate(token);
  };

  const handleComplete = () => {
    setStep('complete');
    if (onComplete) {
      onComplete();
    }
  };

  const handleCopyBackupCodes = () => {
    copyToClipboard(backupCodes.join('\\n'));
    toast({
      title: t('copied'),
      description: t('backup_codes_copied')
    });
  };

  useEffect(() => {
    // Automatically start the setup when the component mounts
    setupMutation.mutate();
  }, []);

  // Render based on the current step
  if (step === 'initial' || setupMutation.isPending) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">{t('setting_up_two_factor')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <LoadingSpinner size={40} />
          <p className="mt-4 text-center">{t('generating_two_factor_secret')}</p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">{t('scan_qr_code')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6">
          <div className="mb-4 p-4 bg-white rounded-lg">
            <div dangerouslySetInnerHTML={{ __html: qrCode }} />
          </div>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('two_factor_manual_entry')}
            </AlertDescription>
          </Alert>
          
          <div className="w-full mb-4">
            <Label htmlFor="secret">{t('secret_key')}</Label>
            <div className="flex items-center mt-1">
              <Input 
                id="secret"
                value={secret} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="ml-2"
                onClick={() => {
                  copyToClipboard(secret);
                  toast({ title: t('copied'), description: t('secret_copied') });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="w-full mb-6">
            <Label htmlFor="token">{t('verification_code')}</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="font-mono text-center text-lg"
            />
          </div>
          
          <Button 
            onClick={handleVerify} 
            disabled={verifyMutation.isPending || token.length !== 6}
            className="w-full"
          >
            {verifyMutation.isPending ? (
              <>
                <LoadingSpinner size={16} className="mr-2" />
                {t('verifying')}
              </>
            ) : (
              t('verify')
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'backupCodes') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">{t('backup_codes')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-6">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('backup_codes_warning')}
            </AlertDescription>
          </Alert>

          <div className="w-full mb-4 p-4 bg-muted rounded-lg font-mono text-sm">
            <ul className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <li key={index} className="py-1 px-2">{code}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex w-full gap-2 mb-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleCopyBackupCodes}
            >
              {copying ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {t('copy_codes')}
            </Button>
          </div>
          
          <Button onClick={handleComplete} className="w-full">
            {t('complete_setup')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Complete step - show success message
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{t('setup_complete')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <p className="text-center mb-4">{t('two_factor_enabled_success')}</p>
        <Button onClick={onComplete} className="w-full">
          {t('close')}
        </Button>
      </CardContent>
    </Card>
  );
}