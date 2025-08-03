import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { CheckCircle2, XCircle } from "lucide-react";
import { EmployeeLayout } from "../../pages/employee-dashboard/layout";

export default function EmployeeDocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const { user } = useUser();

  const { data: documents } = useQuery({
    queryKey: ["employee-documents"],
    queryFn: async () => {
      const res = await fetch("/api/employee/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    }
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: async ({ documentId, status, comment }: { documentId: number; status: string; comment?: string }) => {
      const response = await fetch(`/api/kyc/documents/${documentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, comment }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status update error:', errorText);
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
      toast({
        title: "Success",
        description: "Document status updated successfully",
      });
      setSelectedDoc(null);
      setComment('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  return (
    <EmployeeLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Document Review</h1>
        <div className="grid gap-6">
          {documents?.map((doc: any) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle>Document #{doc.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p>Status: {doc.status}</p>
                  {doc.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateDocumentStatusMutation.mutate({
                          documentId: doc.id,
                          status: 'approved',
                          comment
                        })}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateDocumentStatusMutation.mutate({
                          documentId: doc.id,
                          status: 'rejected',
                          comment
                        })}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Decline
                      </Button>
                      <textarea
                        placeholder="Add comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-2 w-full"
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </EmployeeLayout>
  );
}