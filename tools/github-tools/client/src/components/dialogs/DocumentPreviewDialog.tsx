import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { PDFViewer } from "@/components/ui/pdf-viewer";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
}

export function DocumentPreviewDialog({ open, onOpenChange, documentId }: DocumentPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-destructive">{error}</p>
            </div>
          )}
          <iframe 
            src={`/api/kyc/preview/${documentId}`}
            className="w-full h-full border rounded-md"
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              console.error('Document preview error:', e);
              setIsLoading(false);
              setError("Failed to load document preview");
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}