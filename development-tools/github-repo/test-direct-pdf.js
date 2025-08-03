/**
 * Direct test script for PDF generation
 * This bypasses the browser environment and tests PDF generation directly
 */

const { generateTransactionPDF } = require('./client/src/utils/pdf-generator');

// Sample user data for testing
const testUser = {
  id: 999,
  username: 'testuser',
  fullName: 'Test User',
  email: 'test@example.com',
  address: '123 Test Street, Test City, 12345',
  phoneNumber: '+1234567890',
  balance: 1500,
  balanceCurrency: 'USD'
};

// Sample transaction data for testing
const testTransactions = [
  {
    id: 1,
    type: 'USDC',
    amount: 100,
    currency: 'USDC',
    status: 'completed',
    createdAt: '2025-04-01T10:00:00Z',
    completedAt: '2025-04-01T10:05:00Z',
    reference: 'usdc-1001',
    initialAmount: 100,
    commissionAmount: 0,
    totalAmount: 100,
    txHash: '0x1234567890abcdef',
    conversions: {
      usd: 100,
      eur: 92,
      gbp: 80,
      chf: 95
    }
  },
  {
    id: 2,
    type: 'SEPA',
    amount: 500,
    currency: 'EUR',
    status: 'pending',
    createdAt: '2025-04-02T14:30:00Z',
    completedAt: null,
    reference: 'sepa-1002',
    initialAmount: 500,
    commissionAmount: 15,
    totalAmount: 485,
    conversions: {
      usd: 535,
      eur: 485,
      gbp: 425,
      chf: 495
    }
  },
  {
    id: 3,
    type: 'USDT',
    amount: 250,
    currency: 'USDT',
    status: 'completed',
    createdAt: '2025-04-03T09:15:00Z',
    completedAt: '2025-04-03T09:20:00Z',
    reference: 'usdt-1003',
    initialAmount: 250,
    commissionAmount: 2.5,
    totalAmount: 247.5,
    txHash: '0xabcdef1234567890',
    conversions: {
      usd: 247.5,
      eur: 225,
      gbp: 195,
      chf: 235
    }
  }
];

// Translations function for testing
const testTranslator = (key) => {
  const translations = {
    'transaction_history': 'Transaction History',
    'generating_pdf': 'Generating PDF...',
    'client_information': 'Client Information',
    'client_id': 'Client ID',
    'username': 'Username',
    'user_full_name': 'Full Name',
    'user_email': 'Email',
    'user_phone': 'Phone',
    'user_address': 'Address',
    'account_summary': 'Account Summary',
    'balance_usd': 'Balance (USD)',
    'total_transactions': 'Total Transactions',
    'date': 'Date',
    'type': 'Type',
    'reference': 'Reference',
    'initial_amount': 'Initial Amount',
    'commission_fee': 'Commission Fee',
    'final_amount': 'Final Amount',
    'status': 'Status',
    'crypto_transactions': 'Cryptocurrency Transactions',
    'fiat_transactions': 'Fiat Transactions',
    'page': 'Page',
    'of': 'of',
    'scan_to_verify': 'Scan to verify authenticity',
    'date_tr': 'Date',
    'type_reference_tr': 'Type/Reference',
    'amount_details_tr': 'Amount Details',
    'status_tr': 'Status',
    'details_tr': 'Details',
    'download_history': 'Download PDF',
    'initial_tr': 'Initial',
    'commission_tr': 'Commission',
    'total_tr': 'Total',
    'status_completed': 'Completed',
    'status_pending': 'Pending',
    'status_failed': 'Failed',
    'reference_short_tr': 'Ref',
    'generated': 'Generated on',
    'no_transactions': 'No transactions found',
    'company_reg': 'Registration No.: 22490035',
    'company_vat': 'VAT ID: CZ22490035',
    'legal_notice': 'This document is created electronically and is valid without signature.',
    'tx_type_usdt': 'USDT Transfer',
    'tx_type_usdc': 'USDC Transfer',
    'tx_type_sepa': 'SEPA Deposit',
    'statement_id': 'Statement ID',
    'statement_date': 'Statement Date',
    'statement_period': 'Statement Period',
    'total_deposits': 'Total Deposits',
    'total_withdrawals': 'Total Withdrawals',
    'statement_disclaimer': 'This is an automatically generated statement.',
    'transaction_list': 'Transaction List',
    'pdf_generation_error': 'Error generating PDF'
  };
  
  return translations[key] || key;
};

/**
 * Run the test and log progress
 */
async function testPdfGeneration() {
  console.log('Starting PDF generation test...');
  
  try {
    console.log('Generating transaction PDF...');
    await generateTransactionPDF(
      testTransactions,
      testUser,
      testTranslator,
      'en'
    );
    console.log('PDF generated successfully! Check your downloads folder.');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

// Run the test
testPdfGeneration();