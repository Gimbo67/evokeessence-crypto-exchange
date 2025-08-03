import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export default function EmailVerificationDialog({
  open,
  onOpenChange,
  email,
}: EmailVerificationDialogProps) {
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send verification code");
      }

      return response.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid verification code");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your email has been verified successfully.",
      });
      // Invalidate the user query to refresh the verification status
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Close the dialog
      onOpenChange(false);
      // Reset the form state
      setCode("");
      setCodeSent(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const handleSendCode = () => {
    sendCodeMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (!code) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }
    verifyCodeMutation.mutate(code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            {codeSent
              ? `We've sent a verification code to ${email}. Please enter it below.`
              : `Click the button below to receive a verification code at ${email}.`}
          </p>

          {!codeSent ? (
            <Button
              onClick={handleSendCode}
              disabled={sendCodeMutation.isPending}
              className="w-full"
            >
              {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
            </Button>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyCodeMutation.isPending}
                  className="flex-1"
                >
                  {verifyCodeMutation.isPending ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  onClick={handleSendCode}
                  disabled={sendCodeMutation.isPending}
                  variant="outline"
                >
                  Resend Code
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}