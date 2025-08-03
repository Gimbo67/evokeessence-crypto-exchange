import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Configure axios to always include credentials
axios.defaults.withCredentials = true;

interface Balance {
  amount: number;
  currency: string;
  usdEquivalent?: number;
}

interface User {
  id: number;
  username: string;
  email?: string;
  isAdmin: boolean;
  isEmployee: boolean;
  isContractor: boolean;
  userGroup?: string;
  kycStatus?: string;
  kyc_status?: string;
  balances?: Balance[];
  balance?: number;
  balanceCurrency?: string;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
  requireTwoFactor?: boolean;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  countryOfResidence?: string;
  gender?: string;
  referralCode?: string;
  contractorCommissionRate?: number;
}

// Transform function to handle both legacy and multi-currency balance formats
// and properly handle snake_case to camelCase conversion
const transformUserData = (data: any): User => {
  try {
    console.log('Raw user data for transformation:', data);
    
    // Ensure we have a valid object to work with
    if (!data || typeof data !== 'object') {
      console.error('Invalid user data provided:', data);
      throw new Error('Invalid user data format');
    }
    
    // More robust Boolean conversion using explicit comparison to true
    // This handles values that might come as strings 't', 'true', or booleans
    const toBool = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowercaseValue = value.toLowerCase();
        return lowercaseValue === 'true' || lowercaseValue === 't' || lowercaseValue === '1';
      }
      return !!value;
    };
    
    // Create a new object with standardized property names
    const transformedData: any = {
      id: data.id,
      username: data.username,
      email: data.email,
      
      // Convert snake_case to camelCase for common fields with more robust boolean handling
      isAdmin: data.isAdmin !== undefined ? toBool(data.isAdmin) : 
               data.is_admin !== undefined ? toBool(data.is_admin) : false,
               
      isEmployee: data.isEmployee !== undefined ? toBool(data.isEmployee) : 
                  data.is_employee !== undefined ? toBool(data.is_employee) : false,
                  
      isContractor: data.isContractor !== undefined ? toBool(data.isContractor) : 
                    data.is_contractor !== undefined ? toBool(data.is_contractor) : false,
      
      userGroup: data.userGroup || data.user_group,
      kycStatus: data.kycStatus || data.kyc_status,
      fullName: data.fullName || data.full_name,
      phoneNumber: data.phoneNumber || data.phone_number,
      address: data.address,
      countryOfResidence: data.countryOfResidence || data.country_of_residence,
      gender: data.gender,
      
      twoFactorEnabled: data.twoFactorEnabled !== undefined ? toBool(data.twoFactorEnabled) : 
                         data.two_factor_enabled !== undefined ? toBool(data.two_factor_enabled) : 
                         (data.two_factor_secret ? true : false),
                         
      twoFactorVerified: data.twoFactorVerified !== undefined ? toBool(data.twoFactorVerified) :
                         data.two_factor_verified !== undefined ? toBool(data.two_factor_verified) : false,
      
      // Add requireTwoFactor property
      requireTwoFactor: data.requireTwoFactor !== undefined ? toBool(data.requireTwoFactor) :
                       data.require_two_factor !== undefined ? toBool(data.require_two_factor) :
                       (toBool(data.two_factor_enabled) && !toBool(data.two_factor_verified)),
      
      // Add contractor-specific fields
      referralCode: data.referralCode || data.referral_code || '',
      contractorCommissionRate: data.contractorCommissionRate || data.contractor_commission_rate || 0.85
    };

    // Handle legacy single balance format
    if (typeof data.balance !== 'undefined') {
      const balance = typeof data.balance === 'string' 
        ? parseFloat(data.balance) 
        : data.balance;

      if (isNaN(balance)) {
        console.warn('Invalid balance format:', data.balance);
        transformedData.balances = [];
      } else {
        transformedData.balance = balance;
        transformedData.balanceCurrency = data.balanceCurrency || data.balance_currency || 'USD';
        transformedData.balances = [{
          amount: balance,
          currency: transformedData.balanceCurrency
        }];
      }
    }
    // Handle multi-currency balance format
    else if (Array.isArray(data.balances)) {
      transformedData.balances = data.balances.map((balance: { amount: string | number; currency: string; usdEquivalent?: number }) => ({
        amount: typeof balance.amount === 'string' 
          ? parseFloat(balance.amount) 
          : balance.amount,
        currency: balance.currency as string,
        usdEquivalent: balance.usdEquivalent
      }));
    }
    // Fallback with empty balances array
    else {
      console.warn('No balance data found:', data);
      transformedData.balances = [];
    }

    console.log('Transformed user data:', transformedData);
    
    return transformedData as User;
  } catch (error) {
    console.error('Error transforming user data:', error);
    // Create minimal user object with correct property names
    return {
      id: data.id,
      username: data.username,
      isAdmin: data.isAdmin || data.is_admin || false,
      isEmployee: data.isEmployee || data.is_employee || false,
      isContractor: data.isContractor || data.is_contractor || false,
      twoFactorEnabled: data.twoFactorEnabled || data.two_factor_enabled || false,
      twoFactorVerified: data.twoFactorVerified || data.two_factor_verified || false,
      referralCode: data.referralCode || data.referral_code || '',
      contractorCommissionRate: data.contractorCommissionRate || data.contractor_commission_rate || 0.85,
      balances: []
    };
  }
};

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string, recaptchaToken?: string | null) => Promise<{
    requireTwoFactor?: boolean;
    success?: boolean;
    userData?: any;
    message?: string;
  } | undefined>;
  logout: () => Promise<{
    success: boolean;
    shouldRedirect: boolean;
  } | undefined>;
  checkAuthStatus: () => Promise<boolean>;
  register: (userData: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Checking auth status...');
      
      // Use bypass route to avoid Vite middleware issues with additional parameters to avoid caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/bypass/user?t=${timestamp}`, { 
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        } 
      });
      
      // Check for explicit authentication state first
      if (response.status === 200 && response.data) {
        // Case 1: Response explicitly indicates not authenticated
        if (response.data.authenticated === false) {
          console.log('Auth status check - explicitly not authenticated:', response.data);
          setUser(null);
          setIsAuthenticated(false);
          return false;
        }
        
        // Case 2: Response has user data with an ID
        if (response.data.id) {
          console.log('Auth status check - received user data:', response.data);
          const userData = transformUserData(response.data);
          console.log('Auth status check - transformed user data:', userData);
          
          // Enhanced role checking - check both camelCase and snake_case properties
          // This is crucial for correct routing and access control
          const isEmployeeFlag = 
            response.data.isEmployee === true || 
            response.data.is_employee === true;
            
          const isAdminFlag = 
            response.data.isAdmin === true || 
            response.data.is_admin === true;
            
          const isContractorFlag =
            response.data.isContractor === true ||
            response.data.is_contractor === true;
          
          // Explicitly set these properties in case transformation had issues
          userData.isEmployee = isEmployeeFlag;
          userData.isAdmin = isAdminFlag;
          userData.isContractor = isContractorFlag;
          
          // Ensure referral code and commission rate are set for contractors
          if (isContractorFlag) {
            userData.referralCode = response.data.referralCode || response.data.referral_code || '';
            userData.contractorCommissionRate = response.data.contractorCommissionRate || 
                                               response.data.contractor_commission_rate || 0.85;
            console.log('Detected contractor user with referral code:', userData.referralCode);
          }
          
          // Log the authentication status with detailed role information
          console.log('User authentication status:', {
            authenticated: true,
            isEmployee: isEmployeeFlag,
            isAdmin: isAdminFlag,
            userGroup: userData.userGroup,
            userId: userData.id
          });
          
          // Check if user has 2FA enabled but not verified yet
          const twoFactorEnabled = 
            response.data.twoFactorEnabled === true || 
            response.data.two_factor_enabled === true;
            
          const twoFactorVerified = 
            response.data.twoFactorVerified === true || 
            response.data.two_factor_verified === true;
          
          console.log('2FA status check:', {
            twoFactorEnabled,
            twoFactorVerified,
            sessionData: response.data
          });
          
          // If 2FA is enabled but not verified, we need special handling
          if (twoFactorEnabled && !twoFactorVerified) {
            console.log('User has 2FA enabled but not verified - needs 2FA verification');
            
            // Store user data but mark as requiring 2FA
            userData.requireTwoFactor = true;
            setUser(userData);
            
            // Not fully authenticated until 2FA is verified
            setIsAuthenticated(false);
            return false;
          }
          
          // Update auth state - fully authenticated
          setUser(userData);
          setIsAuthenticated(true);
          return true;
        }
        
        // Case 3: Response has authenticated=true flag explicitly set
        if (response.data.authenticated === true) {
          console.log('Auth status check - explicitly authenticated but no user data:', response.data);
          
          // Try to use any available user data
          if (response.data.user) {
            const userData = transformUserData(response.data.user);
            setUser(userData);
            setIsAuthenticated(true);
            return true;
          }
          
          // If we have authentication but no user data, this is unusual
          console.warn('Server indicates authenticated=true but no user data provided');
          setIsAuthenticated(true);
          return true;
        }
      }
      
      console.log('Auth status check - not authenticated:', response.data);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Make sure to clear user state on error
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Helper function to detect if the client is running on a mobile device
  const isMobileDevice = () => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
    }
    return false;
  };

  const login = async (username: string, password: string, recaptchaToken?: string | null) => {
    try {
      setIsLoading(true);
      console.log('Attempting login with:', username);
      
      // In development mode, create a more reliable token if none provided
      let finalToken = recaptchaToken;
      if (!finalToken && process.env.NODE_ENV === 'development') {
        console.log('Development mode detected, setting dummy reCAPTCHA token');
        finalToken = 'test-token'; // Use same token that worked in our curl test
      }
      
      // Prepare the request body with credentials and reCAPTCHA token
      const requestBody = {
        username, 
        password,
        recaptchaToken: finalToken || '',
        timestamp: new Date().getTime() // Add timestamp to prevent caching
      };
      
      console.log('Login request includes reCAPTCHA token:', !!finalToken);
      
      // Set up headers with mobile detection
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      };
      
      // Add mobile-specific headers if detected as a mobile device
      const mobileDevice = isMobileDevice();
      if (mobileDevice) {
        console.log('Mobile device detected - adding iOS app headers');
        // @ts-ignore - we're intentionally adding custom headers
        headers['x-ios-app'] = 'true';
        // @ts-ignore
        headers['x-app-version'] = '1.0.0';
        // @ts-ignore
        headers['x-app-platform'] = 'iOS';
      }
      
      console.log('Login request body:', JSON.stringify(requestBody));
      console.log('Device type:', mobileDevice ? 'Mobile' : 'Desktop');
      
      try {
        // Use fetch with proper headers for CORS and JSON handling
        console.log('Initiating login fetch request to /bypass/auth/login');
        const response = await fetch('/bypass/auth/login', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          credentials: 'include'
        });
        
        console.log('Login fetch response received, status:', response.status);
        
        // Handle non-JSON responses for better error reporting
        const contentType = response.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Response is not JSON:', contentType);
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          return {
            success: false,
            message: 'Server error: Unexpected response format'
          };
        }
        
        // Parse the response data
        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok) {
          // Check if 2FA is required first
          if (data.requireTwoFactor || data.require_two_factor) {
            console.log('Two-factor authentication required');
            return { 
              requireTwoFactor: true,
              success: false,
              message: 'Two-factor authentication required',
              isAdmin: data.isAdmin || data.is_admin,
              isEmployee: data.isEmployee || data.is_employee,
              isContractor: data.isContractor || data.is_contractor
            };
          }
          
          // Extract user data from the response
          let userData;
          if (data.user) {
            // Response has a 'user' object property
            userData = transformUserData(data.user);
          } else if (data.id && data.username) {
            // Response itself contains user data
            userData = transformUserData(data);
          } else {
            console.warn('Login successful but no user data found in response');
            // Force an auth status check to get user data
            await checkAuthStatus();
            return {
              success: true,
              message: 'Login successful'
            };
          }
          
          // Set the user data and authentication state directly
          if (userData) {
            console.log('Setting user data from login response:', userData);
            setUser(userData);
            setIsAuthenticated(true);
          }
          
          console.log('Login successful with roles:', {
            admin: userData?.isAdmin,
            employee: userData?.isEmployee,
            contractor: userData?.isContractor,
            success: true
          });
          
          toast({
            title: "Login successful",
            description: "You are now logged in"
          });
          
          // Invalidate all auth-related queries
          queryClient.invalidateQueries({ queryKey: ['user'] });
          
          // Return success with user data and all needed information
          return { 
            success: true,
            authenticated: true,
            userData: userData || data
          };
        } else {
          // Handle error status codes
          console.warn('Login failed with status:', response.status);
          
          // Check if we need to show CAPTCHA
          const requireCaptcha = data.requireCaptcha || false;
          if (requireCaptcha) {
            console.log('Server indicates CAPTCHA is required for next attempt');
          }
          
          return {
            success: false,
            requireCaptcha,
            message: data?.message || 'Login failed with status ' + response.status
          };
        }
      } catch (error) {
        // Catch network errors
        console.error('Login network error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle structured error responses
      const errorMessage = error.response?.data?.message || 
                          (error instanceof Error ? error.message : "Invalid credentials");
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting to logout...');
      
      // Clear client state first for immediate UI feedback
      setUser(null);
      setIsAuthenticated(false);
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries();
      
      // Add headers to ensure we get a JSON response
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Use bypass endpoint to avoid Vite middleware issues
      const response = await axios.post('/bypass/auth/logout', {}, { 
        withCredentials: true,
        headers
      });
      
      console.log('Logout response:', response.status);
      
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
      
      // After logout is complete, return a signal that navigation should happen
      return { success: true, shouldRedirect: true };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if server request fails, ensure client-side state is cleared
      setUser(null);
      setIsAuthenticated(false);
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries();
      
      toast({
        title: "Logout",
        description: "You have been logged out",
      });
      
      // After logout is complete, return a signal that navigation should happen
      return { success: true, shouldRedirect: true };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      
      // Ensure kyc_status is properly set
      const registrationData = {
        ...userData,
        kyc_status: userData.kyc_status || 'not_started'
      };
      
      // Add headers to ensure we get a JSON response
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Use bypass endpoint to avoid Vite middleware issues
      const response = await axios.post('/bypass/auth/register', registrationData, {
        withCredentials: true,
        headers
      });

      if (response.status === 201 || response.status === 200) {
        console.log('Registration successful:', response.data);
        
        // Automatically log the user in after registration
        await checkAuthStatus();
        
        return {
          ok: true,
          data: response.data
        };
      } else {
        return {
          ok: false,
          message: 'Registration failed'
        };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message || 'Registration failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isLoading,
    isAuthenticated,
    user,
    login,
    logout,
    checkAuthStatus,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}