import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Separator } from "../ui/separator";
import { useToast } from "../ui/use-toast";
import { Skeleton } from "../ui/skeleton";
import axios from "axios";

interface DepositDetailsProps {
  depositId: string;
}

export function DepositDetails({ depositId }: DepositDetailsProps) {
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeposit = async () => {
      try {
        setLoading(true);
        // Make sure depositId is a valid string
        if (!depositId || typeof depositId !== 'string') {
          throw new Error('Invalid deposit ID');
        }

        const response = await axios.get(`/api/transactions/${depositId}`);
        setDeposit(response.data);
      } catch (error) {
        console.error("Error fetching deposit:", error);
        toast({
          title: "Error",
          description: "Failed to fetch deposit details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (depositId) {
      fetchDeposit();
    }
  }, [depositId, toast]);

  if (loading) {
    return <DepositDetailsSkeleton />;
  }

  if (!deposit) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Deposit not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">Deposit Details</h3>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{deposit.amount} {deposit.currency}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{deposit.status}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{new Date(deposit.createdAt).toLocaleString()}</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-medium break-all">{deposit.txHash || "Pending"}</span>
          </div>

          {deposit.reference && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium">{deposit.reference}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DepositDetailsSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <Skeleton className="h-6 w-1/3 mb-4" />

        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>

          <Separator />

          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}