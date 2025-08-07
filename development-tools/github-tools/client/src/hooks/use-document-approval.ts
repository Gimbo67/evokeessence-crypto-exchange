import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useState } from 'react';

export function useDocumentApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const documentApprovalMutation = useMutation({
    mutationFn: async ({ documentId, status, comment }: { documentId: number; status: string; comment?: string }) => {
      try {
        if (status === 'approved') setIsApproving(true);
        if (status === 'rejected') setIsRejecting(true);

        const response = await fetch(`/api/kyc/documents/${documentId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status, comment }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json();
      } finally {
        setIsApproving(false);
        setIsRejecting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/documents"] });
      toast({
        title: "Success",
        description: "Document status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    documentApprovalMutation,
    isApproving,
    isRejecting
  };
}

export default useDocumentApproval;