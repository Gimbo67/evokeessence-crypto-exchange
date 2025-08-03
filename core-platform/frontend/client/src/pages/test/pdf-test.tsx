/**
 * Test page for PDF functionality
 * This page tests the client PDF generation without requiring login
 */
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { generateTransactionPDF } from "@/utils/pdf-generator";
import { Loader2, Download } from "lucide-react";

// Sample transaction data for testing
const testTransactions = [
  {
    id: 1,
    type: "Deposit",
    amount: 1000,
    currency: "EUR",
    status: "completed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    reference: "DEP-2025-001",
    initialAmount: 1020,
    commissionAmount: 20,
    totalAmount: 1000
  },
  {
    id: 2,
    type: "USDC Purchase",
    amount: 500,
    currency: "USD",
    status: "pending",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    reference: "USDC-2025-001",
    initialAmount: 510,
    commissionAmount: 10,
    totalAmount: 500
  },
  {
    id: 3,
    type: "Withdrawal",
    amount: 200,
    currency: "EUR",
    status: "completed",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
    reference: "WTH-2025-001",
    initialAmount: 200,
    commissionAmount: 5,
    totalAmount: 195
  }
];

// Sample user data
const testUserData = {
  id: 999,
  username: "testuser",
  fullName: "Test User",
  email: "test@example.com",
  address: "Czech Republic",
  phoneNumber: "+420123456789",
  balance: 1500,
  balanceCurrency: "EUR"
};

// Simple translation function
const testTranslator = (key: string) => {
  const translations: Record<string, string> = {
    'transaction_history_title': 'Transaction History',
    'transaction_history_subject': 'EvokeEssence Transaction History Statement',
    'transaction_report': 'Transaction Report',
    'statement_info': 'Statement Information',
    'statement_date': 'Statement Date',
    'statement_id': 'Statement ID',
    'statement_period': 'Statement Period',
    'client_information': 'Client Information',
    'client_id': 'Client ID',
    'username': 'Username',
    'user_full_name': 'Full Name',
    'user_email': 'Email',
    'user_phone': 'Phone',
    'user_address': 'Address',
    'account_summary': 'Account Summary',
    'date': 'Date',
    'type': 'Type',
    'reference': 'Reference',
    'amount': 'Amount',
    'currency': 'Currency',
    'status': 'Status',
    'page': 'Page',
    'of': 'of',
    'generated': 'Generated',
    'crypto_transactions': 'Cryptocurrency Transactions',
    'fiat_transactions': 'Fiat Transactions',
    'status_completed': 'Completed',
    'status_pending': 'Pending',
    'status_failed': 'Failed',
    'confidential': 'CONFIDENTIAL',
    'pdf_generation_error': 'Failed to generate PDF. Please try again later.',
    'initial_amount': 'Initial Amount',
    'commission_fee': 'Commission Fee',
    'final_amount': 'Final Amount'
  };
  return translations[key] || key;
};

export default function PDFTest() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const handleTestPDF = async () => {
    setIsGenerating(true);
    setLastError(null);
    setLastSuccess(null);

    try {
      console.log('Starting PDF generation test...');
      
      // Test the PDF generation function
      await generateTransactionPDF(testTransactions, testUserData, testTranslator, 'en');
      
      console.log('PDF generation completed successfully!');
      setLastSuccess('PDF generated and download initiated successfully!');
      
    } catch (error) {
      console.error('PDF generation test failed:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>PDF Generation Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This page tests the PDF generation functionality with sample transaction data.
              </p>
              <p className="text-sm text-muted-foreground">
                Sample data: {testTransactions.length} transactions for user "{testUserData.username}"
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleTestPDF}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Test PDF Generation
                  </>
                )}
              </Button>

              {lastSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">Success!</p>
                  <p className="text-green-700 text-sm">{lastSuccess}</p>
                </div>
              )}

              {lastError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{lastError}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Test Transaction Data:</h4>
              <div className="bg-muted p-3 rounded text-sm">
                <ul className="space-y-1">
                  {testTransactions.map((tx) => (
                    <li key={tx.id}>
                      {tx.type} - {tx.amount} {tx.currency} ({tx.status})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Test User Data:</h4>
              <div className="bg-muted p-3 rounded text-sm">
                <p>Username: {testUserData.username}</p>
                <p>Full Name: {testUserData.fullName}</p>
                <p>Email: {testUserData.email}</p>
                <p>Balance: {testUserData.balance} {testUserData.balanceCurrency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}