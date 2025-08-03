/**
 * Test page for employee login
 * This is a standalone page that can be used to test the employee login flow
 * without navigating through the main application.
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TestEmployeeLogin() {
  const { login, isAuthenticated, user, isLoading, checkAuthStatus } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('testemployee');
  const [password, setPassword] = useState('employee123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      setTestStatus('loading');
      
      // Attempt login
      console.log('Testing login with:', { username, password });
      const loginResult = await login(username, password);
      
      console.log('Login result:', loginResult);
      
      if (loginResult?.success) {
        setTestStatus('success');
        setStatusMessage(`Login successful! User: ${loginResult.userData?.username || 'Unknown'}`);
        
        // Check authentication status
        const isAuth = await checkAuthStatus();
        
        setStatusMessage((prev) => 
          `${prev}\nAuth status check: ${isAuth ? 'Authenticated' : 'Not authenticated'}`
        );
        
        toast({
          title: 'Login Success',
          description: `Logged in as ${user?.username || 'employee'}`
        });
      } else if (loginResult?.requireTwoFactor) {
        setTestStatus('error');
        setErrorMessage('2FA required - not supported in this test');
      } else {
        setTestStatus('error');
        setErrorMessage(loginResult?.message || 'Login failed for unknown reason');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setTestStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    }
  };
  
  const checkAuth = async () => {
    try {
      setTestStatus('loading');
      const result = await checkAuthStatus();
      setTestStatus('idle');
      
      console.log('Auth check result:', result);
      console.log('User data:', user);
      
      if (result && user) {
        setStatusMessage(
          `User authenticated:\n` +
          `- Username: ${user.username}\n` +
          `- ID: ${user.id}\n` +
          `- Employee: ${user.isEmployee ? 'Yes' : 'No'}\n` +
          `- Admin: ${user.isAdmin ? 'Yes' : 'No'}\n` +
          `- Group: ${user.userGroup || 'None'}`
        );
      } else {
        setStatusMessage('Not authenticated');
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      setErrorMessage(error.message || 'Failed to check authentication');
    }
  };
  
  const navigateAfterLogin = () => {
    if (isAuthenticated && user) {
      if (user.isEmployee) {
        navigate('/employee/dashboard');
      } else if (user.isAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMessage('You must be logged in to navigate');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Employee Login Test</CardTitle>
          <CardDescription>Test employee authentication and navigation</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={testStatus === 'loading' || isLoading}
              >
                {testStatus === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : 'Login'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={checkAuth}
                disabled={testStatus === 'loading' || isLoading}
              >
                Check Auth
              </Button>
            </div>
          </form>
          
          {errorMessage && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {statusMessage && (
            <Alert className={`mt-4 ${testStatus === 'success' ? 'border-green-500' : ''}`}>
              {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              <AlertTitle>Status</AlertTitle>
              <AlertDescription className="whitespace-pre-line">
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {isAuthenticated && user && (
            <Alert className="mt-4 border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Authentication Status</AlertTitle>
              <AlertDescription>
                Logged in as {user.username} ({user.isEmployee ? 'Employee' : user.isAdmin ? 'Admin' : 'User'})
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="flex flex-col w-full gap-2">
            <Button 
              onClick={navigateAfterLogin} 
              disabled={!isAuthenticated || !user}
              variant="default"
            >
              Go to Dashboard
            </Button>
            
            <div className="text-xs text-muted-foreground mt-2">
              Current authentication state: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
              {isLoading && ' (Loading...)'}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default TestEmployeeLogin;