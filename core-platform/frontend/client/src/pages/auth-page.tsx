import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth from the correct file
import { useTranslations } from "@/lib/language-context";
import { Container } from "@/components/ui/container";
import { InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useQueryClient } from "@tanstack/react-query";
import ReCAPTCHA from 'react-google-recaptcha';
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phoneNumber: z.string().min(6, "Phone number must be at least 6 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  countryOfResidence: z.string().min(2, "Country must be at least 2 characters"),
  referralCode: z.string().optional(),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { register, checkAuthStatus, login, user } = useAuth(); // Extract more data from useAuth
  const t = useTranslations();
  const queryClient = useQueryClient();
  
  // Initialize reCAPTCHA and set a dummy token in development mode
  useEffect(() => {
    // Log reCAPTCHA configuration for debugging
    console.log('ReCAPTCHA configuration:', {
      siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LejmAArAAAAAJnUk3-5oIVgBILVWzhku_v2JIRP',
      environment: process.env.NODE_ENV,
      usingDefault: !import.meta.env.VITE_RECAPTCHA_SITE_KEY,
      isDevelopment: process.env.NODE_ENV === 'development'
    });
    
    // Enhanced initialization process - handle production environment better
    const initializeRecaptcha = () => {
      // Check if the Google reCAPTCHA API is available on window
      // Use safer type checking for window global objects
      const recaptchaLoaded = typeof window !== 'undefined' && 
                            typeof (window as any).grecaptcha !== 'undefined' && 
                            typeof (window as any).grecaptcha.ready === 'function';
      
      if (recaptchaLoaded) {
        console.log('Google reCAPTCHA API detected on window');
      } else {
        console.log('Google reCAPTCHA API not yet available on window');
      }

      // Set recaptchaReady flag
      setRecaptchaReady(true);
      console.log('ReCAPTCHA initialization timer completed');
      
      // In development mode, set a dummy token automatically
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode detected, setting dummy reCAPTCHA token');
        setRecaptchaToken('dummy-token-for-dev');
      } else if (recaptchaRef.current) {
        // In production, try to pre-execute recaptcha after a delay to warm it up
        console.log('Production mode - pre-executing reCAPTCHA to warm up');
        try {
          // Add a delay to let the component fully initialize
          setTimeout(() => {
            if (recaptchaRef.current) {
              try {
                // Use executeAsync which always returns a Promise
                try {
                  recaptchaRef.current.executeAsync()
                    .then(() => console.log('Initial reCAPTCHA warm-up successful'))
                    .catch((error: Error) => {
                      console.warn('Initial reCAPTCHA execute warm-up failed:', error);
                    });
                } catch (err) {
                  console.log('ReCAPTCHA executeAsync not available, falling back to standard execute');
                  // Regular execute is void type in some definitions but actually returns a Promise
                  recaptchaRef.current.reset();
                  setTimeout(() => {
                    if (recaptchaRef.current) {
                      recaptchaRef.current.execute();
                      console.log('ReCAPTCHA executed with standard method');
                    }
                  }, 100);
                }
              } catch (executeError) {
                console.warn('Failed to execute reCAPTCHA:', executeError);
              }
            }
          }, 2000);
        } catch (err) {
          console.warn('Failed to pre-execute reCAPTCHA:', err);
        }
      }
    };
    
    // Initial timer for reCAPTCHA initialization
    const timer = setTimeout(initializeRecaptcha, 1000);
    
    // Add window listener to detect when Google reCAPTCHA is fully loaded
    if (typeof window !== 'undefined') {
      // Use addEventListener instead of direct assignment for better type compatibility
      window.addEventListener('load', () => {
        console.log('Window load event triggered - checking reCAPTCHA status');
        initializeRecaptcha();
      });
    }

    return () => clearTimeout(timer);
  }, []);

  // Handle 2FA URL parameter
  useEffect(() => {
    // Parse the URL search parameters
    const searchParams = new URLSearchParams(window.location.search);
    const require2fa = searchParams.get('require2fa');
    
    if (require2fa === '1') {
      console.log('User redirected back to auth page with require2fa parameter');
      setShowTwoFactor(true);
      toast({
        title: t('verify_2fa'),
        description: t('2fa_verification_required') || 'Please verify your two-factor authentication code',
      });
    }
  }, [location, toast, t]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleCodeChange = (value: string, position: number) => {
    setTwoFactorCode(prev => {
      const newCode = prev.padEnd(6, ' ').split('');
      newCode[position] = value;
      return newCode.join('').trim();
    });
  };

  async function onLogin(data: LoginFormData) {
    setIsLoading(true);
    try {
      console.log('Attempting login with:', data.username);
      
      // Use a simplified login approach
      toast({
        title: "Logging in...",
        description: "Please wait",
      });
      
      // Execute reCAPTCHA if available
      let captchaToken = recaptchaToken;
      
      // In development mode, ensure we have a token even if reCAPTCHA fails
      if (process.env.NODE_ENV === 'development' && !captchaToken) {
        console.log('Development mode detected, using dummy token for login');
        captchaToken = 'dummy-token-for-dev';
      } else if (!captchaToken) {
        // Fix for production environment: Make sure we handle recaptcha initialization properly
        console.log('No reCAPTCHA token available, trying to execute reCAPTCHA');
        
        // Check if reCAPTCHA is ready
        if (recaptchaRef.current) {
          try {
            console.log('Executing reCAPTCHA verification...');
            // Set a flag to indicate we're attempting to get a token
            const tokenPromise = recaptchaRef.current.executeAsync();
            
            // Wait with a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('reCAPTCHA timeout')), 5000);
            });
            
            // Race the token acquisition against the timeout
            const result = await Promise.race([tokenPromise, timeoutPromise])
              .catch(err => {
                console.warn('reCAPTCHA execution issue:', err.message);
                return process.env.NODE_ENV === 'development' ? 'dummy-token-for-dev' : null;
              });
            
            // Ensure we have a string or null for the captcha token
            captchaToken = typeof result === 'string' ? result : null;
              
            console.log('reCAPTCHA token generated:', captchaToken ? 'Success' : 'Failed');
            if (captchaToken) {
              setRecaptchaToken(captchaToken);
            }
          } catch (captchaError) {
            console.error('Error executing reCAPTCHA:', captchaError);
            
            // Fall back to dummy token in development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('Falling back to dummy token in development mode');
              captchaToken = 'dummy-token-for-dev';
            }
          }
        } else {
          console.warn('ReCAPTCHA reference not available');
        }
      }
      
      // Log the token for debugging
      if (captchaToken) {
        if (captchaToken === 'dummy-token-for-dev') {
          console.log('Using dummy development token for reCAPTCHA');
        } else {
          console.log('Using reCAPTCHA token (first 10 chars):', captchaToken.substring(0, 10) + '...');
        }
      } else {
        console.log('No reCAPTCHA token available');
      }
      
      // Enhanced direct API call with better headers and error handling
      console.log('Making login API call with username and reCAPTCHA token');
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Create request body
      const requestBody = {
        username: data.username,
        password: data.password,
        recaptchaToken: captchaToken, // Include the reCAPTCHA token
        timestamp: timestamp // Add timestamp to request body as well
      };
      
      console.log('Login request body (without password):', {
        ...requestBody,
        password: '[REDACTED]',
        timestamp: timestamp
      });
      
      console.log('Attempting fetch to /bypass/auth/login...');
      const response = await fetch(`/bypass/auth/login?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      console.log('Login response received, status:', response.status);
    
      if (!response.ok) {
          console.error('Login failed with status:', response.status);
        
          // Try to extract more specific error information
          let errorMessage = "Invalid username or password";
          
          try {
            // Try to parse JSON error if possible
            const errorData = await response.json();
            console.error('Error details:', errorData);
            
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
            
            // Check if this is a CAPTCHA error
            if (errorMessage.includes('CAPTCHA') || errorMessage.includes('recaptcha') || errorMessage.includes('captcha')) {
              console.log('CAPTCHA verification failed, attempting to refresh token and retry');
              // In development mode, use a new dummy token and notify
              if (process.env.NODE_ENV === 'development') {
                toast({
                  title: "CAPTCHA Check",
                  description: "Development mode: CAPTCHA auto-validated",
                });
                return onLogin(data); // Retry the login
              }
            }
            
            if (errorData.showCaptcha) {
              console.log('Server requests showing CAPTCHA due to multiple failed attempts');
              // Force reCAPTCHA to execute if possible
              if (recaptchaRef.current) {
                recaptchaRef.current.reset();
                setTimeout(() => recaptchaRef.current?.execute(), 500);
              }
            }
            
            if (errorData.banned) {
              errorMessage = "Your IP address has been temporarily banned due to too many failed login attempts. Please try again later.";
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
        
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive"
          });
          return;
      }
      
      // Parse the response
      const loginResult = await response.json();
      console.log('Raw login API response:', loginResult);
      
      // Check if 2FA is required
      if (loginResult.requireTwoFactor || loginResult.require_two_factor) {
        console.log('Two-factor authentication required');
        setShowTwoFactor(true);
        return;
      }
      
      // If login was successful, use a more direct redirection approach
      if (loginResult.success) {
        console.log('Login successful - determining user type');
        console.log('Full login result:', loginResult);

        toast({
          title: "Login Successful!",
          description: "Redirecting to dashboard...",
        });
        
        // Immediately determine role without waiting
        const isAdmin = 
          loginResult.isAdmin === true || 
          loginResult.is_admin === true;
          
        const isEmployee = 
          loginResult.isEmployee === true || 
          loginResult.is_employee === true;
        
        console.log('User roles:', { isAdmin, isEmployee });
        
        // Force a direct navigation instead of using the more complex approach
        console.log('Performing direct navigation based on user role');
        
        // Build destination URL based on role
        let destinationUrl = '/dashboard';
        if (isAdmin) {
          console.log('Admin user detected, redirecting to admin dashboard');
          destinationUrl = '/admin/dashboard';
        } else if (isEmployee) {
          console.log('Employee user detected, redirecting to employee dashboard');
          destinationUrl = '/employee/dashboard';
        }
        
        console.log(`Redirecting to: ${destinationUrl}`);
        
        // Force navigation immediately - more reliable than setTimeout
        window.location.replace(destinationUrl);
        
        // Get the current authenticated user to determine the proper redirect
        console.log('Fetching current user data for redirection...');
        const userInfo = await fetch('/bypass/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (userInfo.ok) {
          const userData = await userInfo.json();
          console.log('User data retrieved:', userData);
          
          // Check for unverified 2FA in user data
          const twoFactorEnabled = 
            userData.twoFactorEnabled === true || 
            userData.two_factor_enabled === true;
            
          const twoFactorVerified = 
            userData.twoFactorVerified === true || 
            userData.two_factor_verified === true;
          
          if (twoFactorEnabled && !twoFactorVerified) {
            console.log('User data shows 2FA enabled but not verified, showing 2FA screen');
            setShowTwoFactor(true);
            return;
          }
          
          await queryClient.invalidateQueries({ queryKey: ['user'] });
          
          // Check for returnUrl from our component state first, then query params
          if (returnUrl) {
            console.log('Redirecting to saved returnUrl from state:', returnUrl);
            window.location.href = returnUrl;
            return;
          }
          
          // Fall back to query parameters if state isn't set
          const returnUrlParam = new URLSearchParams(window.location.search).get('returnUrl');
          if (returnUrlParam) {
            console.log('Redirecting to return URL from query parameters:', returnUrlParam);
            window.location.href = returnUrlParam;
            return;
          }
          
          // Redirect based on user role with enhanced role detection
          const isAdmin = userData.isAdmin === true || userData.is_admin === true;
          const isEmployee = userData.isEmployee === true || userData.is_employee === true;
          const isContractor = userData.isContractor === true || userData.is_contractor === true;
          
          console.log('User roles for redirection:', {
            isAdmin,
            isEmployee,
            isContractor,
            userData
          });
          
          if (isAdmin) {
            console.log('Redirecting to admin dashboard');
            window.location.href = '/admin/dashboard';
            return;
          } 
          
          if (isEmployee) {
            console.log('Redirecting to employee dashboard');
            window.location.href = '/employee/dashboard';
            return;
          } 
          
          if (isContractor) {
            console.log('Redirecting to contractor dashboard');
            window.location.href = '/contractor/dashboard';
            return;
          }
          
          // Regular user - redirect to dashboard
          console.log('Redirecting to regular user dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log('Failed to get user info, redirecting to dashboard');
          // If we can't get user info but login succeeded, just go to dashboard
          setLocation("/dashboard");
        }
      } else {
        // Handle explicit failure case or non-standard responses
        console.error('Login failed:', loginResult?.message || 'Unknown error');
        toast({
          title: "Login Failed",
          description: loginResult?.message || "Invalid username or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      // This should only happen for unexpected errors
      console.error('Unexpected login error in component:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyTwoFactor() {
    setIsLoading(true);
    try {
      console.log('Starting 2FA verification during login...', {
        twoFactorCode: twoFactorCode,
        codeLength: twoFactorCode.length,
        timestamp: new Date().toISOString()
      });
      
      // Get the username from the login form
      const username = loginForm.getValues().username;
      console.log('Username for 2FA verification:', username);
      
      if (!username) {
        console.error('Username is missing for 2FA verification');
        throw new Error(t('username_missing_error') || 'Username is required');
      }
      
      // Try to use the bypass endpoint which is more reliable
      const endpointUrl = '/bypass/2fa/validate-json';
      console.log(`Calling 2FA validation endpoint: ${endpointUrl}`);
      
      // Use our improved direct API endpoint for 2FA validation
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Request': 'true',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          token: twoFactorCode,
          username: username,
          returnUrl: '/dashboard', // Add returnUrl for redirection
          timestamp: new Date().getTime() // Add timestamp to prevent caching
        }),
        credentials: 'include'
      });

      console.log('2FA validation response status:', response.status);
      
      // Log response headers for debugging
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('2FA validation response headers:', responseHeaders);
      
      // Check content type first to avoid Response body already used error
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        // Handle HTML response before trying to parse JSON
        const htmlResponse = await response.text();
        console.error('HTML response received:', htmlResponse.substring(0, 200) + '...');
        throw new Error(t('html_response_error') || 'Unexpected HTML response from server');
      }
      
      // Try to parse JSON directly - our improved endpoint should always return JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log('2FA validation response data:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        // Rethrow as a general error
        throw new Error(t('invalid_response_format') || 'Invalid response format');
      }

      // Check if request was successful
      if (!response.ok || !responseData.success) {
        console.error('2FA validation failed:', responseData);
        throw new Error(responseData.message || t('invalid_verification_code'));
      }
      
      // Success - update all auth-related states
      console.log('Invalidating all auth-related queries');
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Update session state on server and local auth state
      try {
        console.log('Requesting session update after 2FA verification with user ID:', responseData.userId);
        
        // First try to update the session on the server (ensures cookies are set properly)
        // Use bypass endpoint for better compatibility with direct API access
        const sessionUpdate = await fetch('/bypass/auth/session-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: responseData.userId,
            twoFactorVerified: true,
            timestamp: new Date().getTime() // Prevent caching
          })
        });
        
        let sessionUpdateData;
        try {
          sessionUpdateData = await sessionUpdate.json();
          console.log('Session update response data:', sessionUpdateData);
        } catch (err) {
          console.error('Failed to parse session update response:', err);
        }
        
        if (sessionUpdate.ok) {
          console.log('Session successfully updated with twoFactorVerified flag');
          
          // Ensure auth state is refreshed - multiple times to ensure it propagates
          for (let i = 0; i < 2; i++) {
            console.log(`Auth status check attempt ${i+1}`);
            await checkAuthStatus();
            // Small delay between checks
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Show success message
          toast({
            title: t('success'),
            description: t('logged_in_successfully'),
          });
          
          // Add a delay before redirecting to ensure all auth state updates are processed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the returnUrl from the response or use dashboard as fallback
          const redirectUrl = responseData.returnUrl || '/dashboard';
          console.log(`Redirecting to ${redirectUrl} after 2FA verification`);
          // Use direct window location for more reliable navigation
          window.location.href = redirectUrl;
          return;
        } else {
          console.warn('Session update failed, status:', sessionUpdate.status);
          if (sessionUpdateData) {
            console.warn('Session update error details:', sessionUpdateData);
            
            // Handle case where user needs to login again
            if (sessionUpdateData.requiresLogin) {
              toast({
                variant: "destructive",
                title: t('session_expired'),
                description: t('please_login_again'),
              });
              
              // Delay redirect to login to allow toast to be seen
              setTimeout(() => {
                window.location.href = '/auth';
              }, 2000);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error updating session after 2FA:', error);
      }
      
      // Fallback approach - force a full auth check and then redirect
      try {
        console.log('Using fallback approach to update auth state');
        
        // Force auth check
        await checkAuthStatus();
        
        // Use the returnUrl from the response or default to dashboard
        const redirectUrl = responseData.returnUrl || '/dashboard';
        console.log(`Using fallback redirect to: ${redirectUrl}`);
        
        // Full page reload to ensure clean state
        window.location.href = redirectUrl;
      } catch (fallbackError) {
        console.error('Fallback auth update failed:', fallbackError);
        // Last resort - try to use returnUrl from response or fall back to dashboard
        const lastResortUrl = responseData?.returnUrl || '/dashboard';
        console.log(`Last resort redirect to: ${lastResortUrl}`);
        window.location.href = lastResortUrl;
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: error instanceof Error ? error.message : t('invalid_verification_code'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(data: RegisterFormData) {
    setIsLoading(true);
    try {
      console.log('Starting registration process...');
      
      // Prepare registration data with referral code if provided
      const registrationData = {
        ...data,
        profileUpdated: false,
        kyc_status: 'not_started', // Set initial KYC status
        referred_by: data.referralCode || null // Include referral code if provided
      };
      
      console.log('Sending registration data to server...');
      const result = await register(registrationData);
      
      if (!result.ok) {
        console.error('Registration failed with error:', result.message);
        throw new Error(result.message);
      }

      console.log('Registration successful, response data:', result.data);
      
      toast({
        title: t('success'),
        description: "Registered successfully",
      });
      
      try {
        // After successful registration, refresh auth status
        console.log('Checking authentication status after registration...');
        const isAuthenticated = await checkAuthStatus();
        console.log('Authentication status:', isAuthenticated);
        
        await queryClient.invalidateQueries({ queryKey: ['user'] });
        
        // Get the current authenticated user after registration
        console.log('Fetching user data after registration...');
        const response = await fetch('/api/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache', 
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User data retrieved:', userData);
          
          // Explicitly check role and redirect accordingly
          if (userData?.isAdmin) {
            console.log('User is admin, redirecting to admin dashboard');
            window.location.href = '/admin/dashboard';
            return;
          } else if (userData?.isEmployee) {
            console.log('User is employee, redirecting to employee dashboard');
            window.location.href = '/employee/dashboard';
            return;
          } else {
            console.log('User is regular client, redirecting to dashboard');
            // Short delay to ensure all state is updated
            setTimeout(() => {
              setLocation("/dashboard");
            }, 100);
          }
        } else {
          console.error('Failed to fetch user data after registration');
          // Fall back to default redirection
          console.log('Falling back to default dashboard redirection');
          setTimeout(() => {
            setLocation("/dashboard");
          }, 100);
        }
      } catch (authError) {
        console.error('Error during post-registration process:', authError);
        // Even if we have issues with the redirect, navigate to dashboard
        console.log('Redirecting to dashboard despite errors');
        setTimeout(() => {
          setLocation("/dashboard");
        }, 100);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: t('error'),
        description: error instanceof Error ? error.message : "Registration failed",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-muted/30 w-full">
        <Container className="w-full">
          <Card className="w-full max-w-4xl mx-auto">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('login')}</TabsTrigger>
                <TabsTrigger value="register">{t('register')}</TabsTrigger>
            </TabsList>
            <CardContent className="pt-6">
              <TabsContent value="login">
                {showTwoFactor ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium">{t('enter_2fa_code')}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t('2fa_code_required')}
                    </p>
                    <div className="flex justify-center">
                      <div className="flex gap-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot 
                            key={index} 
                            index={index}
                            onValueChange={(value) => handleCodeChange(value, index)}
                          >
                            {twoFactorCode[index] || ""}
                          </InputOTPSlot>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={onVerifyTwoFactor}
                      disabled={isLoading || twoFactorCode.length !== 6 || twoFactorCode.includes(' ')}
                    >
                      {t('verify')}
                    </Button>
                  </div>
                ) : (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('username')}</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('password')}</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Hidden ReCAPTCHA element */}
                      <div style={{ display: 'none' }}>
                        {recaptchaReady && (
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LejmAArAAAAAJnUk3-5oIVgBILVWzhku_v2JIRP'}
                            size="invisible"
                            onChange={(token) => {
                              console.log("ReCAPTCHA token received:", token ? "valid token" : "null token");
                              setRecaptchaToken(token);
                            }}
                            onExpired={() => {
                              console.log("ReCAPTCHA token expired");
                              setRecaptchaToken(null);
                            }}
                            onError={() => {
                              console.log("ReCAPTCHA error occurred");
                              toast({
                                title: "Error",
                                description: "Failed to load reCAPTCHA. Please refresh the page.",
                                variant: "destructive"
                              });
                              setRecaptchaToken(null);
                            }}
                          />
                        )}
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            {t('signing_in')}
                          </span>
                        ) : (
                          t('login')
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="w-full"
                        onClick={() => setLocation("/password-reset")}
                      >
                        {t('forgot_password')}
                      </Button>
                    </form>
                  </Form>
                )}
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                    <div className="grid gap-8 lg:grid-cols-2">
                      {/* Left Column - Account Information */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{t('account_information')}</h3>
                            <p className="text-sm text-muted-foreground">{t('account_information_desc')}</p>
                          </div>
                          <div className="grid gap-4">
                            <FormField
                              control={registerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('username')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} disabled={isLoading} placeholder={t('username_placeholder')} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('email')}</FormLabel>
                                  <FormControl>
                                    <Input type="email" {...field} disabled={isLoading} placeholder="your@email.com" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('password')}</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} disabled={isLoading} placeholder="Min. 6 characters" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Optional Information */}
                        <div className="space-y-4">
                          <FormField
                            control={registerForm.control}
                            name="referralCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('referral_code_optional')}</FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={isLoading} placeholder={t('referral_code_placeholder')} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Right Column - Personal Information */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{t('personal_information')}</h3>
                            <p className="text-sm text-muted-foreground">{t('personal_information_desc')}</p>
                          </div>
                          <div className="grid gap-4">
                            <FormField
                              control={registerForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile_fullname')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} disabled={isLoading} placeholder="John Doe" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile_phone')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} disabled={isLoading} placeholder="+1 234 567 8900" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile_address')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} disabled={isLoading} placeholder={t('address_placeholder')} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="countryOfResidence"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile_country')}</FormLabel>
                                  <FormControl>
                                    <Input {...field} disabled={isLoading} placeholder={t('country_placeholder')} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="gender"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('profile_gender')}</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('profile_select_gender')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="male">{t('profile_gender_male')}</SelectItem>
                                      <SelectItem value="female">{t('profile_gender_female')}</SelectItem>
                                      <SelectItem value="other">{t('profile_gender_other')}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions - Full Width */}
                    <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                      {t('terms_and_conditions_agreement')}{' '}
                      <a href="/legal" className="text-primary hover:underline">
                        {t('terms_and_conditions_link')}
                      </a>
                      ,{' '}
                      <a href="/legal" className="text-primary hover:underline">
                        {t('refund_policy_link')}
                      </a>
                      , {t('legal_agreements_text')}{' '}
                      <a href="/legal" className="text-primary hover:underline">
                        {t('legal_page_link')}
                      </a>
                      .
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          {t('creating_account')}
                        </span>
                      ) : (
                        t('register')
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </CardContent>
          </Tabs>
          </Card>
        </Container>
      </main>
      <Footer />
    </div>
  );
}