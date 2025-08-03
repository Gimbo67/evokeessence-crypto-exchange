import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().length(6, "Verification code must be 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormData = z.infer<typeof resetFormSchema>;

export default function PasswordReset() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isCodeSent, setIsCodeSent] = useState(false);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  const requestResetMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log("Requesting password reset for:", email);
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Check for non-JSON responses
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        console.error("Received non-JSON response:", contentType);
        throw new Error("Server returned an invalid response format");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(errorData.message || "Failed to request password reset");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "Check your email for the verification code",
      });
      setIsCodeSent(true);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send code",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetFormData) => {
      console.log("Verifying reset code and setting new password");
      const response = await fetch("/api/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          code: data.code,
          newPassword: data.password,
        }),
      });

      // Check for non-JSON responses
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        console.error("Received non-JSON response:", contentType);
        throw new Error("Server returned an invalid response format");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
        throw new Error(errorData.message || "Failed to verify code or reset password");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password has been reset successfully",
      });
      navigate("/auth");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
      });
    },
  });

  const requestCode = () => {
    const email = form.getValues("email");
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address",
      });
      return;
    }
    requestResetMutation.mutate(email);
  };

  const onSubmit = (data: ResetFormData) => {
    if (!isCodeSent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please request a verification code first",
      });
      return;
    }
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={requestCode}
                          disabled={requestResetMutation.isPending}
                        >
                          {requestResetMutation.isPending ? "Sending..." : "Get Code"}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="text-center tracking-widest"
                          {...field}
                        />
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
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}