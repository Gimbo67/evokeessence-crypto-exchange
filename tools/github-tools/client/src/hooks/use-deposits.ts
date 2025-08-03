import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/language-context";

export type DepositFormValues = {
  amount: string;
  currency: string;
};

export type DepositDetails = {
  depositId: number;
  reference: string;
  bankDetails: {
    name: string;
    iban: string;
    bic: string;
    address: string;
  };
  amount: {
    original: number;
    commission: number;
    final: number;
    currency: string;
  };
  status?: string;
  createdAt?: string;
};

export function useDeposits() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [currentDepositId, setCurrentDepositId] = useState<number | null>(null);
  const [currentDepositDetails, setCurrentDepositDetails] = useState<DepositDetails | null>(null);

  // Create a new deposit
  const createDeposit = useMutation({
    mutationFn: async (values: DepositFormValues): Promise<DepositDetails> => {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include"
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Deposit creation failed:', errorText);
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(t("deposit_created_success"));
      setCurrentDepositId(data.depositId);
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (error) => {
      console.error("Deposit creation error:", error);
      toast.error(t("deposit_creation_failed"));
    }
  });

  // Get all deposits for the current user
  const deposits = useQuery({
    queryKey: ["deposits"],
    queryFn: async () => {
      const response = await fetch("/api/deposits", {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch deposits");
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get a specific deposit by ID
  const { data: depositDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["deposit", currentDepositId],
    queryFn: async () => {
      if (!currentDepositId) return null;

      const response = await fetch(`/api/deposits/${currentDepositId}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch deposit details");
      }

      const data = await response.json() as DepositDetails;
      setCurrentDepositDetails(data);
      return data;
    },
    enabled: !!currentDepositId,
  });

  // Function to manually fetch deposit details
  const getDepositDetails = async (id: number) => {
    setCurrentDepositId(id);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["deposit", id],
        queryFn: async () => {
          const response = await fetch(`/api/deposits/${id}`, {
            credentials: "include"
          });

          if (!response.ok) {
            throw new Error("Failed to fetch deposit details");
          }

          const data = await response.json() as DepositDetails;
          setCurrentDepositDetails(data);
          return data;
        }
      });
      return data;
    } catch (error) {
      console.error("Error fetching deposit details:", error);
      toast.error(t("failed_to_fetch_deposit") || "Failed to fetch deposit details");
      return null;
    }
  };

  return {
    createDeposit,
    deposits,
    depositDetails,
    currentDepositDetails,
    setCurrentDepositId,
    getDepositDetails,
    isLoadingDetails,
  };
}