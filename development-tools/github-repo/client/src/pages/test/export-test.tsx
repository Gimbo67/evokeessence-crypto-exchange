/**
 * Test page for PDF export functionality
 * This page allows testing the PDF generation without needing to log in
 */
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { generateTransactionPDF } from "@/utils/pdf-generator";
import { Loader2, Download } from "lucide-react";

// Sample user data for testing
const testUser = {
  id: 999,
  username: "testuser",
  fullName: "Test User",
  email: "test@example.com",
  address: "Test Country",
  phoneNumber: "+1234567890",
  balance: 1000,
  balanceCurrency: "EUR"
};

// Sample transaction data for testing
const testTransactions = [
  {
    id: 1,
    type: "Deposit",
    amount: 1000,
    initialAmount: 1020,
    commissionAmount: 20,
    totalAmount: 1000,
    currency: "EUR",
    status: "successful",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    reference: "DEP-2025-03-001",
    conversions: {
      usd: 1080,
      eur: 1000,
      gbp: 860,
      chf: 980
    }
  },
  {
    id: 2,
    type: "USDC Purchase",
    amount: 500,
    initialAmount: 510,
    commissionAmount: 10,
    totalAmount: 500,
    currency: "USD",
    status: "processing",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    reference: "USDC-2025-03-001",
    conversions: {
      usd: 500,
      eur: 465,
      gbp: 395,
      chf: 455
    }
  }
];

// Simple translation function for testing
const translate = (key: string) => {
  const translations: Record<string, string> = {
    'transaction_history': 'Transaction History',
    'download_history': 'Download History',
    'generating_pdf': 'Generating PDF...',
    'pdf_generation_error': 'Error generating PDF. Please try again.',
    'no_transactions_found': 'No transactions found',
    'status_pending': 'Pending',
    'status_processing': 'Processing',
    'status_successful': 'Successful',
    'status_failed': 'Failed',
    'status_unknown': 'Unknown'
  };
  
  return translations[key] || key;
};

export default function ExportTestPage() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    
    try {
      setIsGeneratingPdf(true);
      addLog("Starting PDF generation process");
      
      // Override console.log for this operation to capture logs
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (message: any, ...args: any[]) => {
        originalConsoleLog(message, ...args);
        addLog(`LOG: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`);
      };
      
      console.error = (message: any, ...args: any[]) => {
        originalConsoleError(message, ...args);
        addLog(`ERROR: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`);
      };
      
      // Get the currently selected language from the language context
      const currentLanguage = localStorage.getItem('language') || 'en';
      
      // Generate the PDF with language parameter for proper localization
      addLog(`Using language: ${currentLanguage}`);
      
      await generateTransactionPDF(testTransactions, testUser, translate, currentLanguage);
      
      addLog("PDF generation completed");
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    } catch (error) {
      addLog(`Error generating PDF: ${error}`);
      alert(translate('pdf_generation_error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>PDF Export Test Page</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {translate('generating_pdf')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {translate('download_history')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md">
              <h3 className="font-medium mb-2">Test User Data</h3>
              <pre className="text-xs overflow-auto p-2 bg-slate-200 dark:bg-slate-800 rounded">
                {JSON.stringify(testUser, null, 2)}
              </pre>
            </div>
            
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md">
              <h3 className="font-medium mb-2">Test Transaction Data</h3>
              <pre className="text-xs overflow-auto p-2 bg-slate-200 dark:bg-slate-800 rounded">
                {JSON.stringify(testTransactions, null, 2)}
              </pre>
            </div>
            
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md">
              <h3 className="font-medium mb-2">Generation Logs</h3>
              <div className="bg-black text-green-400 p-2 rounded font-mono text-xs h-60 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">Click download to generate logs...</div>
                ) : (
                  logs.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}