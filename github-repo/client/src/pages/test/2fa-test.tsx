import React, { useState } from 'react';
import { TwoFactorSetupBypass } from '@/components/auth/TwoFactorSetupBypass';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TwoFactorTestPage() {
  const [userId, setUserId] = useState<number>(54); // Default to a test user ID
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [statusData, setStatusData] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSetupComplete = () => {
    setSetupComplete(true);
    toast({
      title: 'Setup Complete',
      description: '2FA setup has been successfully completed!',
      variant: 'default'
    });
    // Switch to status tab
    setActiveTab('status');
    checkStatus();
  };

  const checkStatus = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await fetch(`/bypass/2fa/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.error || 'Failed to retrieve 2FA status');
      }
      
      setStatusData(data);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      setStatusError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setStatusLoading(false);
    }
  };

  const verifyToken = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast({
        title: 'Invalid Token',
        description: 'Please enter a valid 6-digit token',
        variant: 'destructive'
      });
      return;
    }
    
    setVerificationLoading(true);
    setVerificationResult(null);
    
    try {
      const response = await fetch('/bypass/2fa/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          token: verificationToken,
          userId
        })
      });
      
      const data = await response.json();
      setVerificationResult(data);
      
      if (data.status === 'success') {
        toast({
          title: 'Verification Successful',
          description: 'The 2FA token is valid',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error || 'Invalid token',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setVerificationResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">2FA Testing Tool</h1>
      
      <div className="mb-6">
        <Label htmlFor="userId">User ID:</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            id="userId"
            type="number"
            value={userId}
            onChange={(e) => setUserId(parseInt(e.target.value))}
            className="w-32"
          />
          <Button variant="outline" onClick={checkStatus}>
            Check Status
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Use ID 54 for a regular user or 60 for admin test101
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="setup">Setup 2FA</TabsTrigger>
          <TabsTrigger value="status">Check Status</TabsTrigger>
          <TabsTrigger value="verify">Verify Token</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup">
          {setupComplete ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Setup Complete</AlertTitle>
              <AlertDescription>
                2FA has been successfully set up for user {userId}.
                You can now verify tokens or check the status.
              </AlertDescription>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSetupComplete(false)}
              >
                Start New Setup
              </Button>
            </Alert>
          ) : (
            <TwoFactorSetupBypass 
              userId={userId} 
              onComplete={handleSetupComplete} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>2FA Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="text-center py-8">Loading status...</div>
              ) : statusError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{statusError}</AlertDescription>
                </Alert>
              ) : statusData ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Enabled:</span>
                    <span>{statusData.enabled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span>{statusData.method || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backup Codes:</span>
                    <span>{statusData.backupCodesCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User ID:</span>
                    <span>{statusData.userId}</span>
                  </div>
                  
                  <Button onClick={checkStatus} className="w-full">
                    Refresh Status
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p>No status information available</p>
                  <Button onClick={checkStatus} className="mt-4">
                    Check Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Verify 2FA Token</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token">Authentication Code</Label>
                  <Input
                    id="token"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    maxLength={6}
                    placeholder="000000"
                    className="font-mono text-center text-lg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                
                <Button 
                  onClick={verifyToken} 
                  disabled={verificationLoading}
                  className="w-full"
                >
                  {verificationLoading ? 'Verifying...' : 'Verify Token'}
                </Button>
                
                {verificationResult && (
                  <Alert variant={verificationResult.status === 'success' ? 'default' : 'destructive'}>
                    {verificationResult.status === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {verificationResult.status === 'success' ? 'Success' : 'Error'}
                    </AlertTitle>
                    <AlertDescription>
                      {verificationResult.status === 'success' 
                        ? 'Token verified successfully' 
                        : (verificationResult.error || 'Verification failed')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}