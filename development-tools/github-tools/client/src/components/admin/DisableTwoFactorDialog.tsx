import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useTranslations } from "@/lib/language-context";

interface DisableTwoFactorDialogProps {
  userId: number;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DisableTwoFactorDialog({ 
  userId, 
  username, 
  open, 
  onOpenChange,
  onSuccess
}: DisableTwoFactorDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const t = useTranslations();
  const queryClient = useQueryClient();
  
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/2fa/disable/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('twofa_disable_failed'));
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI is updated
      queryClient.invalidateQueries({ queryKey: [`/api/admin/clients/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/client/${userId}`] });
      
      toast({
        title: t('twofa_status_disabled'),
        description: t('admin_2fa_disabled_success')
      });
      
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('error_twofa'),
        description: error.message
      });
    }
  });

  const handleConfirm = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    disableMutation.mutate();
  };

  const handleCancel = () => {
    if (isConfirming) {
      setIsConfirming(false);
      return;
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('disable_2fa')}
          </DialogTitle>
          <DialogDescription>
            {t('disable_2fa_description')} {username} (ID: {userId})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {!isConfirming ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('warning')}</AlertTitle>
              <AlertDescription>
                {t('confirm_disable_2fa')}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="border-red-800 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-800" />
              <AlertTitle className="text-red-800">{t('verification_required')}</AlertTitle>
              <AlertDescription className="text-red-700">
                {t('disable_2fa_warning')}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm space-y-2">
            <p className="font-medium">{t('user_details')}:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t('username')}: {username}</li>
              <li>ID: {userId}</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={disableMutation.isPending}
          >
            {isConfirming ? t('back') : t('cancel')}
          </Button>
          <Button
            variant={isConfirming ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={disableMutation.isPending}
          >
            {disableMutation.isPending ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                {t('disabling')}
              </>
            ) : (
              isConfirming ? t('confirm_disable') : t('disable_2fa')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}