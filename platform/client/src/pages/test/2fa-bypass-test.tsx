import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function TwoFactorBypassTestPage() {
  const [status, setStatus] = useState<any>(null);
  const [setupResponse, setSetupResponse] = useState<any>(null);
  const [validateResponse, setValidateResponse] = useState<any>(null);
  const [disableResponse, setDisableResponse] = useState<any>(null);
  const [regenerateResponse, setRegenerateResponse] = useState<any>(null);
  const [userId, setUserId] = useState<string>("60"); // Default to test user ID 60
  const [token, setToken] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({
    status: false,
    setup: false,
    validate: false,
    disable: false,
    regenerate: false
  });

  // Check 2FA status using bypass route
  const checkStatus = async () => {
    setIsLoading(prev => ({...prev, status: true}));
    try {
      const response = await fetch(`/bypass/2fa/status`, {
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      const data = await response.json();
      console.log('2FA status response:', data);
      setStatus(data);
    } catch (error) {
      console.error("Error checking status:", error);
      setStatus({ error: "Failed to check status" });
    } finally {
      setIsLoading(prev => ({...prev, status: false}));
    }
  };

  // Setup 2FA using bypass route
  const setupTwoFactor = async () => {
    setIsLoading(prev => ({...prev, setup: true}));
    try {
      const response = await fetch('/bypass/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      console.log('2FA setup response status:', response.status);
      const data = await response.json();
      console.log('2FA setup response:', data);
      
      setSetupResponse(data);
      if (data.qrCode) {
        setQrCode(data.qrCode);
      }
      if (data.secret) {
        setSecret(data.secret);
      }
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      setSetupResponse({ error: "Failed to setup 2FA" });
    } finally {
      setIsLoading(prev => ({...prev, setup: false}));
    }
  };

  // Validate 2FA using bypass route
  const validateTwoFactor = async () => {
    setIsLoading(prev => ({...prev, validate: true}));
    try {
      const response = await fetch('/bypass/2fa/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          token
        })
      });
      
      console.log('2FA validate response status:', response.status);
      const data = await response.json();
      console.log('2FA validate response:', data);
      
      setValidateResponse(data);
    } catch (error) {
      console.error("Error validating 2FA:", error);
      setValidateResponse({ error: "Failed to validate 2FA" });
    } finally {
      setIsLoading(prev => ({...prev, validate: false}));
    }
  };

  // Disable 2FA using bypass route
  const disableTwoFactor = async () => {
    setIsLoading(prev => ({...prev, disable: true}));
    try {
      const response = await fetch('/bypass/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      
      console.log('2FA disable response status:', response.status);
      const data = await response.json();
      console.log('2FA disable response:', data);
      
      setDisableResponse(data);
      
      // Refresh status after disabling
      if (data.status === 'success') {
        await checkStatus();
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      setDisableResponse({ error: "Failed to disable 2FA" });
    } finally {
      setIsLoading(prev => ({...prev, disable: false}));
    }
  };

  // Regenerate backup codes using bypass route
  const regenerateBackupCodes = async () => {
    setIsLoading(prev => ({...prev, regenerate: true}));
    try {
      const response = await fetch('/bypass/2fa/backup-codes/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      console.log('2FA regenerate backup codes response status:', response.status);
      const data = await response.json();
      console.log('2FA regenerate backup codes response:', data);
      
      setRegenerateResponse(data);
      
      // Refresh status after regeneration
      if (data.status === 'success') {
        await checkStatus();
      }
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      setRegenerateResponse({ error: "Failed to regenerate backup codes" });
    } finally {
      setIsLoading(prev => ({...prev, regenerate: false}));
    }
  };

  // Clear responses
  const clearResponses = () => {
    setSetupResponse(null);
    setValidateResponse(null);
    setDisableResponse(null);
    setRegenerateResponse(null);
    setQrCode("");
    setSecret("");
    setToken("");
  };

  // Format JSON for display
  const formatJson = (json: any) => {
    return JSON.stringify(json, null, 2);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">2FA Bypass Testing Page</h1>

      <Alert className="mb-6">
        <AlertTitle>Test Environment</AlertTitle>
        <AlertDescription>
          This page tests the 2FA functionality using bypass routes that avoid Vite middleware issues.
          All API endpoints use direct fetch calls with proper Content-Type headers to ensure proper JSON responses.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription className="text-amber-700">
                    This test page uses the authenticated user session. Make sure you're logged in first.
                  </AlertDescription>
                </Alert>
                <Button onClick={checkStatus} disabled={isLoading.status}>
                  {isLoading.status ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh Status"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Current 2FA Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading.status ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : status ? (
                <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-48">
                  {formatJson(status)}
                </pre>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No status data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="setup" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="disable">Disable</TabsTrigger>
          <TabsTrigger value="backup">Backup Codes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setup Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={setupTwoFactor} 
                className="mb-4"
                disabled={isLoading.setup}
              >
                {isLoading.setup ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Initializing...
                  </>
                ) : (
                  "Initialize 2FA Setup"
                )}
              </Button>
              
              {qrCode && (
                <div className="my-4">
                  <h3 className="text-sm font-medium mb-2">QR Code:</h3>
                  <div dangerouslySetInnerHTML={{ __html: qrCode }} 
                    className="bg-white p-2 inline-block rounded border" />
                </div>
              )}
              
              {secret && (
                <div className="my-4">
                  <h3 className="text-sm font-medium mb-2">Secret Key:</h3>
                  <code className="bg-muted p-2 rounded block">{secret}</code>
                </div>
              )}

              {setupResponse && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Setup Response:</h3>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-48">
                    {formatJson(setupResponse)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validate Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Verification Code:</label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      value={token} 
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <Button 
                      onClick={validateTwoFactor}
                      disabled={isLoading.validate || token.length !== 6}
                    >
                      {isLoading.validate ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Validating...
                        </>
                      ) : (
                        "Validate"
                      )}
                    </Button>
                  </div>
                </div>
                
                {validateResponse && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Validation Response:</h3>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-48">
                      {formatJson(validateResponse)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="mb-4" variant="destructive">
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This will disable 2FA for the user. You will need to provide a valid verification code.
                  </AlertDescription>
                </Alert>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Verification Code:</label>
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      value={token} 
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter 6-digit code or backup code"
                    />
                    <Button 
                      onClick={disableTwoFactor}
                      disabled={isLoading.disable || !token}
                      variant="destructive"
                    >
                      {isLoading.disable ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4" />
                          Disabling...
                        </>
                      ) : (
                        "Disable 2FA"
                      )}
                    </Button>
                  </div>
                </div>
                
                {disableResponse && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Disable Response:</h3>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-48">
                      {formatJson(disableResponse)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Backup Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="mb-4">
                  <AlertTitle>Backup Codes</AlertTitle>
                  <AlertDescription>
                    You can regenerate backup codes here. This will invalidate all existing backup codes.
                  </AlertDescription>
                </Alert>
                
                {status?.backupCodes && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Current Backup Codes:</h3>
                    <div className="grid grid-cols-2 gap-2 bg-muted p-3 rounded">
                      {status.backupCodes.map((code: string, index: number) => (
                        <code key={index} className="font-mono text-xs">{code}</code>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={regenerateBackupCodes}
                  disabled={isLoading.regenerate || !status?.enabled}
                  className="mt-4"
                >
                  {isLoading.regenerate ? (
                    <>
                      <LoadingSpinner className="mr-2 h-4 w-4" />
                      Regenerating...
                    </>
                  ) : (
                    "Regenerate Backup Codes"
                  )}
                </Button>
                
                {regenerateResponse && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Regenerate Response:</h3>
                    <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-48">
                      {formatJson(regenerateResponse)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button variant="outline" onClick={clearResponses}>Clear Responses</Button>
      </div>
    </div>
  );
}