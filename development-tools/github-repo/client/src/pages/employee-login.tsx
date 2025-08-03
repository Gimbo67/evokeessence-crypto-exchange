import React, { useState } from 'react';
import { useLocation } from 'wouter';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

const formSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmployeeLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      setLoginError(null);
      
      console.log("Attempting login with:", data.username);
      
      const response = await axios.post('/bypass/auth/login', {
        username: data.username,
        password: data.password,
        isEmployeeLogin: true, // Flag to indicate employee login
      });
      
      console.log("Login response:", response.data);

      if (response.data.success) {
        if (response.data.requires2FA) {
          setNeedsTwoFactor(true);
          setUserId(response.data.userId);
          toast({
            title: 'Two-factor authentication required',
            description: 'Please enter your verification code',
          });
        } else {
          // Check if user is an employee
          if (response.data.isEmployee) {
            // Fetch current user data to ensure session is established
            const userResponse = await axios.get('/bypass/user');
            console.log("User data retrieved:", userResponse.data);
            
            toast({
              title: 'Login successful',
              description: 'Welcome to the employee portal',
            });
            
            console.log("Login successful, proceeding with redirection");
            
            // Force a delay before redirecting to ensure state is updated
            setTimeout(() => {
              navigate('/employee/dashboard');
            }, 500);
          } else {
            setLoginError('This account does not have employee access');
          }
        }
      } else {
        setLoginError(response.data.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!twoFactorToken) {
      toast({
        title: 'Verification code required',
        description: 'Please enter your verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/bypass/2fa/validate', {
        userId,
        token: twoFactorToken,
      });

      if (response.data.success) {
        toast({
          title: 'Login successful',
          description: 'Welcome to the employee portal',
        });
        navigate('/employee/dashboard');
      } else {
        setLoginError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('2FA validation error:', error);
      setLoginError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Employee Portal</h1>
          <p className="text-muted-foreground mt-2">
            Access the EvokeEssence employee dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Login</CardTitle>
            <CardDescription>
              Enter your employee credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            {!needsTwoFactor ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              </Form>
            ) : (
              <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="twoFactorToken" className="text-sm font-medium">
                    Verification Code
                  </label>
                  <Input
                    id="twoFactorToken"
                    placeholder="Enter your verification code"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center w-full">
              Not an employee? <a href="/auth" className="text-primary">Sign in as a client</a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}