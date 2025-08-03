import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from './use-auth';

export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
  isEmployee: boolean;
  isContractor: boolean;
  userGroup?: string;
  kycStatus?: string;
  kyc_status?: string;
  balance?: number;
  balanceCurrency?: string;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  countryOfResidence?: string;
  gender?: string;
  referralCode: string;
  contractorCommissionRate: number;
  balances?: Array<{ amount: number; currency: string; usdEquivalent?: number }>;
}

export function useUser() {
  console.log("useUser hook called");
  const { user, isLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  console.log("useUser hook data:", { user, isLoading, isAuthenticated });

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!user?.id) {
        throw new Error('User ID not found. Please login again.');
      }

      console.log('Starting profile update:', data);

      const response = await axios.put('/api/user/profile', data, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('Profile update failed - no response data received');
      }

      // Update React Query cache with new user data
      queryClient.setQueryData(['user'], (oldData: any) => ({
        ...oldData,
        ...response.data
      }));

      // Force refetch to ensure cache is fresh
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.refetchQueries({ queryKey: ['user'] });

      return response.data;
    } catch (error: any) {
      console.error('Profile update error:', error.response || error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update profile';
      throw new Error(errorMessage);
    }
  };

  const isUserAdmin = (user: User | null): boolean => {
    return Boolean(user?.isAdmin);
  };

  const isUserEmployee = (user: User | null): boolean => {
    return Boolean(user?.isEmployee);
  };

  const isUserContractor = (user: User | null): boolean => {
    return Boolean(user?.isContractor);
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout', {}, {
        withCredentials: true
      });
      queryClient.setQueryData(['user'], null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      queryClient.setQueryData(['user'], null);
      window.location.href = '/';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin: isUserAdmin(user),
    isEmployee: isUserEmployee(user),
    isContractor: isUserContractor(user),
    updateProfile,
    logout,
  };
}

export const useUsers = (role?: string) => {
  const fetchUsers = async (): Promise<User[]> => {
    try {
      const url = role ? `/api/users?role=${role}` : '/api/users';
      const response = await axios.get(url, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['users', role],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  return {
    users,
    isLoading,
    error,
    refetch,
  };
};