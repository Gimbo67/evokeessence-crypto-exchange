import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import { useLanguage, useTranslations } from '@/lib/language-context';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Form schema for disabling 2FA for a user
const disableUserTwoFactorSchema = z.object({
  userId: z.string().min(1, { message: 'User ID is required' }),
  confirmationCode: z.string().optional(),
});

type DisableUserTwoFactorFormValues = z.infer<typeof disableUserTwoFactorSchema>;

export function AdminTwoFactorManager() {
  const { language } = useLanguage();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [requiresAdminVerification, setRequiresAdminVerification] = useState(false);
  
  // Form for user ID input
  const form = useForm<DisableUserTwoFactorFormValues>({
    resolver: zodResolver(disableUserTwoFactorSchema),
    defaultValues: {
      userId: '',
      confirmationCode: '',
    },
  });

  // Form for confirmation dialog
  const confirmForm = useForm<{ confirmationCode: string }>({
    resolver: zodResolver(z.object({
      confirmationCode: z.string().min(6, { message: 'Invalid verification code' }),
    })),
    defaultValues: {
      confirmationCode: '',
    },
  });

  // Check if the user has 2FA enabled
  const { data: userTwoFactorStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['admin', 'user-2fa-status', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return { hasEnabled2FA: false };
      
      const response = await fetch(`/api/admin/2fa/status/${selectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to check user 2FA status');
      }
      return response.json();
    },
    enabled: !!selectedUserId,
    refetchOnWindowFocus: false,
  });

  // Mutation to disable 2FA for a user
  const disableTwoFactorMutation = useMutation({
    mutationFn: async (data: DisableUserTwoFactorFormValues) => {
      const response = await fetch(`/api/admin/2fa/disable/${data.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationCode: data.confirmationCode || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disable 2FA');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Two-factor authentication has been successfully disabled for this user",
        variant: 'default',
      });
      
      // Reset forms and state
      form.reset();
      confirmForm.reset();
      setIsConfirmDialogOpen(false);
      setSelectedUserId('');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-2fa-status'] });
    },
    onError: (error: Error) => {
      // Check if error message indicates admin verification is required
      if (error.message.includes('admin verification') || error.message.includes('confirmation code')) {
        setRequiresAdminVerification(true);
        setIsConfirmDialogOpen(true);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to disable two-factor authentication for this user",
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: DisableUserTwoFactorFormValues) => {
    setSelectedUserId(values.userId);
    setIsConfirmDialogOpen(true);
  };

  // Handle confirmation dialog submission
  const onConfirmDisable = (values: { confirmationCode: string }) => {
    disableTwoFactorMutation.mutate({
      userId: selectedUserId,
      confirmationCode: values.confirmationCode,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication Management</CardTitle>
        <CardDescription>Manage two-factor authentication settings for users</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Details</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="User ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full"
              disabled={isCheckingStatus || disableTwoFactorMutation.isPending}
            >
              {disableTwoFactorMutation.isPending ? (
                <>
                  <LoadingSpinner className="mr-2" size={16} />
                  Disabling...
                </>
              ) : (
                "Disable User's 2FA"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <Dialog 
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warning</DialogTitle>
            <DialogDescription>Are you sure you want to disable two-factor authentication for this user?</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This is an administrative action that will remove the user's second authentication factor. They will need to set it up again if they want to use 2FA.
            </AlertDescription>
          </Alert>
          
          {requiresAdminVerification && (
            <Form {...confirmForm}>
              <form onSubmit={confirmForm.handleSubmit(onConfirmDisable)} className="space-y-4">
                <FormField
                  control={confirmForm.control}
                  name="confirmationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enter Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Please enter a 6-digit verification code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            
            <Button
              variant="destructive"
              disabled={disableTwoFactorMutation.isPending}
              onClick={() => {
                if (requiresAdminVerification) {
                  confirmForm.handleSubmit(onConfirmDisable)();
                } else {
                  disableTwoFactorMutation.mutate({
                    userId: selectedUserId,
                    confirmationCode: undefined,
                  });
                }
              }}
            >
              {disableTwoFactorMutation.isPending ? (
                <>
                  <LoadingSpinner className="mr-2" size={16} />
                  Disabling...
                </>
              ) : (
                "Confirm Disable User's 2FA"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default AdminTwoFactorManager;