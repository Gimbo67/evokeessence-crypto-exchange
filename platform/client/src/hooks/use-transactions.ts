import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";

export type Transaction = {
  id: number;
  userId: number;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  details?: string;
  createdAt: string;
  updatedAt: string;
  iban?: string;
  bic?: string;
  recipient?: string;
  txHash?: string;
};

export function useTransactions() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<Transaction[]> => {
      try {
        const response = await axios.get("/api/transactions");
        return response.data;
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTransaction(transactionId: string | number) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async (): Promise<Transaction | null> => {
      if (!transactionId) return null;

      try {
        const response = await axios.get(`/api/transactions/${transactionId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching transaction ${transactionId}:`, error);
        toast({
          title: "Error",
          description: "Failed to fetch transaction details. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    },
    enabled: !!transactionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}