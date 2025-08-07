// This is a temporary file to prepare the QR code and translation fixes
// These functions should replace their counterparts in pdf-generator.ts
import jsPDF from 'jspdf';
import qrcode from 'qrcode';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Define basic types for our interfaces
interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reference?: string;
}

interface UserData {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  balance?: number;
  balanceCurrency?: string;
  balances?: Array<{ amount: number; currency: string }>;
}

// Function to properly generate QR codes in PDFs with improved appearance and positioning
// Modified to return a Promise for better async handling
export const fixQRCodeGeneration = async (doc: jsPDF, verificationUrl: string, t: (key: string) => string): Promise<void> => {
  try {
    // Generate QR code with improved parameters for better rendering
    const url = await qrcode.toDataURL(verificationUrl, {
      margin: 1,
      width: 90,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Add QR code as image with improved size and positioning
    doc.addImage(url, 'PNG', 165, 48, 30, 30);
    
    // Add verification text in the selected language
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text(t('scan_to_verify'), 180, 82, { align: 'center' });
    
  } catch (error) {
    console.error('QR code rendering error:', error);
    // Basic fallback if QR code generation fails
    doc.setFillColor(80, 80, 80);
    doc.rect(170, 58, 15, 15, 'F');
  }
};

// Function to properly position company address without overlapping with other elements
export const fixCompanyAddressPosition = (doc: jsPDF) => {
  // Clear previous address that may overlap
  doc.setFillColor(0, 36, 99); // Same as header background
  doc.rect(0, 32, 210, 8, 'F');
  
  // Add company address with proper positioning and formatting
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setCharSpace(0); // Remove character spacing to prevent letter spacing issues
  doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 105, 35, { align: 'center' });
  
  // Add company identifiers
  doc.setFontSize(8);
  doc.text('Registration No.: 22490035, VAT ID: CZ22490035', 105, 39, { align: 'center' });
};

// Format currency for display
const formatCurrency = (amount: number): string => {
  if (amount === undefined) return '';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Add watermark to PDF
const addWatermark = (
  doc: jsPDF, 
  text: string, 
  options?: { 
    opacity?: number; 
    fontSize?: number; 
    angle?: number;
  }
) => {
  // Default options
  const opacity = options?.opacity ?? 0.15;
  const fontSize = options?.fontSize ?? 40;
  const angle = options?.angle ?? 315;
  
  // Save current state
  const currentTextColor = doc.getTextColor();
  const currentFont = doc.getFont();
  const currentFontSize = doc.getFontSize();
  
  // Set styling for watermark
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  
  // Create diagonal watermark
  doc.text(text, 105, 150, { 
    align: 'center',
    angle: angle
  });
  
  // Restore original state
  doc.setTextColor(currentTextColor);
  doc.setFont(currentFont.fontName);
  doc.setFontSize(currentFontSize);
  
  // Apply to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.text(text, 105, 150, { 
      align: 'center',
      angle: angle
    });
    doc.setTextColor(currentTextColor);
    doc.setFont(currentFont.fontName);
    doc.setFontSize(currentFontSize);
  }
  
  // Return to first page
  doc.setPage(1);
};

// Complete fixed implementation of bank statement generation with translations and QR code fixes
// Updated to be async to properly handle QR code generation
export const generateEnhancedBankStatement = async (
  transactions: Transaction[],
  userData: UserData,
  language: string = 'en',
  translationFn?: (key: string) => string
): Promise<void> => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Current date for statement generation
  const date = new Date();
  const formattedDate = format(date, 'dd/MM/yyyy');
  
  // Define statement information with unique ID
  const statementNumber = `EEST-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Setup multilingual translations
  const t = translationFn || ((key: string) => {
    // Translations for all supported languages
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'statement_title': 'Account Statement',
        'statement_number': 'Statement Number',
        'date_issued': 'Date Issued',
        'account_name': 'Account Name',
        'account_id': 'Account ID',
        'current_balance': 'Current Balance',
        'date': 'Date',
        'transaction_type': 'Transaction Type',
        'reference': 'Reference',
        'amount': 'Amount',
        'status': 'Status',
        'total_deposits': 'Total Deposits',
        'total_withdrawals': 'Total Withdrawals',
        'page': 'Page',
        'of': 'of',
        'scan_to_verify': 'Scan QR to verify'
      },
      'de': {
        'statement_title': 'Kontoauszug',
        'statement_number': 'Auszugsnummer',
        'date_issued': 'Ausstellungsdatum',
        'account_name': 'Kontoinhaber',
        'account_id': 'Konto-ID',
        'current_balance': 'Aktueller Kontostand',
        'date': 'Datum',
        'transaction_type': 'Transaktionstyp',
        'reference': 'Referenz',
        'amount': 'Betrag',
        'status': 'Status',
        'total_deposits': 'Gesamteinzahlungen',
        'total_withdrawals': 'Gesamtauszahlungen',
        'page': 'Seite',
        'of': 'von',
        'scan_to_verify': 'QR-Code scannen zur Überprüfung'
      },
      'cs': {
        'statement_title': 'Výpis z účtu',
        'statement_number': 'Číslo výpisu',
        'date_issued': 'Datum vystavení',
        'account_name': 'Jméno účtu',
        'account_id': 'ID účtu',
        'current_balance': 'Aktuální zůstatek',
        'date': 'Datum',
        'transaction_type': 'Typ transakce',
        'reference': 'Reference',
        'amount': 'Částka',
        'status': 'Stav',
        'total_deposits': 'Celkové vklady',
        'total_withdrawals': 'Celkové výběry',
        'page': 'Strana',
        'of': 'z',
        'scan_to_verify': 'Naskenujte QR kód pro ověření'
      }
    };
    
    // Return translation based on selected language or fallback to English
    const langDict = translations[language] || translations['en'];
    return langDict[key] || key;
  });
  
  // Company branding and header
  doc.setFillColor(0, 36, 99); // Dark blue header
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('EvokeEssence Exchange', 105, 20, { align: 'center' });
  
  // Apply fixed company address layout to prevent overlapping
  fixCompanyAddressPosition(doc);
  
  // Statement information section
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(245, 245, 245);
  doc.rect(10, 45, 190, 40, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(16);
  doc.text(t('statement_title'), 105, 55, { align: 'center' });
  
  // Add QR code for statement verification using our improved async function
  const verificationUrl = `https://evokeessence.com/verify/${statementNumber}`;
  // Wait for QR code generation to complete
  await fixQRCodeGeneration(doc, verificationUrl, t);
  
  // Statement details
  doc.setFontSize(10);
  doc.text(`${t('statement_number')}: ${statementNumber}`, 15, 65);
  doc.text(`${t('date_issued')}: ${formattedDate}`, 15, 70);
  doc.text(`${t('account_name')}: ${userData.fullName || userData.username}`, 15, 75);
  doc.text(`${t('account_id')}: ${userData.id}`, 15, 80);
  
  // Account balance
  doc.setFontSize(11);
  doc.setTextColor(0, 100, 0);
  const balanceText = userData.balances && userData.balances.length > 0 
    ? userData.balances.map(b => `${formatCurrency(b.amount)} ${b.currency}`).join(', ')
    : `${formatCurrency(userData.balance || 0)} ${userData.balanceCurrency || 'USD'}`;
  doc.text(`${t('current_balance')}: ${balanceText}`, 105, 75);
  
  // Transaction table header
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 90, 190, 10, 'F');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(t('date'), 15, 96);
  doc.text(t('transaction_type'), 50, 96);
  doc.text(t('reference'), 90, 96);
  doc.text(t('amount'), 155, 96);
  doc.text(t('status'), 185, 96);
  
  // Transaction rows
  let y = 105;
  transactions.forEach((tx, index) => {
    // Add page if needed
    if (y > 270) {
      doc.addPage();
      // Reset y position and add header to new page
      y = 20;
      doc.setFillColor(240, 240, 240);
      doc.rect(10, y, 190, 10, 'F');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(10);
      doc.text(t('date'), 15, y + 6);
      doc.text(t('transaction_type'), 50, y + 6);
      doc.text(t('reference'), 90, y + 6);
      doc.text(t('amount'), 155, y + 6);
      doc.text(t('status'), 185, y + 6);
      y += 15;
    }
    
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(10, y - 5, 190, 10, 'F');
    }
    
    const txDate = new Date(tx.createdAt);
    const formattedTxDate = format(txDate, 'dd/MM/yyyy');
    
    doc.setTextColor(60, 60, 60);
    doc.text(formattedTxDate, 15, y);
    doc.text(tx.type.charAt(0).toUpperCase() + tx.type.slice(1), 50, y);
    doc.text(tx.reference || '-', 90, y);
    
    // Set color based on transaction type
    if (tx.type === 'deposit') {
      doc.setTextColor(0, 100, 0); // Green for deposits
    } else if (tx.type === 'withdrawal') {
      doc.setTextColor(180, 0, 0); // Red for withdrawals
    }
    
    // Format and display transaction amount
    let amountDisplay = '';
    if (tx.type === 'deposit') {
      amountDisplay = `+${formatCurrency(tx.amount)} ${tx.currency}`;
    } else {
      amountDisplay = `-${formatCurrency(tx.amount)} ${tx.currency}`;
    }
    doc.text(amountDisplay, 155, y);
    
    // Status with appropriate color
    doc.setTextColor(
      tx.status === 'completed' ? 0 : 
      tx.status === 'pending' ? 180 : 
      180, 
      tx.status === 'completed' ? 100 : 
      tx.status === 'pending' ? 120 : 
      0, 
      0
    );
    doc.text(tx.status.charAt(0).toUpperCase() + tx.status.slice(1), 185, y);
    
    // Reset text color
    doc.setTextColor(60, 60, 60);
    
    y += 10;
  });
  
  // Summary section
  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, 200, y);
  y += 10;
  
  // Calculate totals
  const totalDeposits = transactions
    .filter(tx => tx.type === 'deposit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalWithdrawals = transactions
    .filter(tx => tx.type === 'withdrawal' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  // Display summary
  doc.setFontSize(11);
  doc.text(`${t('total_deposits')}: ${formatCurrency(totalDeposits)} ${userData.balanceCurrency || 'USD'}`, 15, y);
  doc.text(`${t('total_withdrawals')}: ${formatCurrency(totalWithdrawals)} ${userData.balanceCurrency || 'USD'}`, 15, y + 7);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${t('page')} ${i} ${t('of')} ${pageCount}`, 
      105, 
      290, 
      { align: 'center' }
    );
    doc.text(
      'EvokeEssence Exchange - © ' + new Date().getFullYear(), 
      105, 
      295, 
      { align: 'center' }
    );
  }
  
  // Add watermark
  addWatermark(doc, 'EvokeEssence Exchange', {
    opacity: 0.04,
    angle: -45,
    fontSize: 60
  });
  
  // Save the PDF
  doc.save(`${userData.username || 'user'}_statement_${date.getFullYear()}${(date.getMonth() + 1)}${date.getDate()}.pdf`);
};