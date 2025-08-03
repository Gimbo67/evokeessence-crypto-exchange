import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import qrcode from 'qrcode';
import { downloadPDFWithFallbacks } from './pdf-download-utils';

// Define types
interface Transaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  reference?: string;
  initialAmount?: number;
  commissionAmount?: number;
  totalAmount?: number;
  txHash?: string;
  conversions?: {
    usd?: number;
    eur?: number;
    gbp?: number;
    chf?: number;
  };
}

interface UserData {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  balances?: Array<{ amount: number; currency: string }>;
  balance?: number;
  balanceCurrency?: string;
}

/**
 * Add professional watermark to PDF document
 * @param doc - jsPDF document instance
 * @param text - Watermark text
 * @param options - Configuration options
 */
const addProfessionalWatermark = (
  doc: jsPDF, 
  text: string, 
  options?: { 
    opacity?: number; 
    fontSize?: number; 
    angle?: number;
    color?: [number, number, number];
    currentPage?: boolean;
  }
) => {
  // Default options
  const opacity = options?.opacity ?? 0.15;
  const fontSize = options?.fontSize ?? 40;
  const angle = options?.angle ?? 315;
  const color = options?.color ?? [180, 180, 180];
  
  // Save current state
  const currentTextColor = doc.getTextColor();
  const currentFont = doc.getFont();
  const currentFontSize = doc.getFontSize();
  
  // Set styling for watermark
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  
  // Create diagonal watermark with correct positioning
  doc.text(text, 105, 150, { 
    align: 'center',
    angle: angle
  });
  
  // Restore original state
  doc.setTextColor(currentTextColor);
  doc.setFont(currentFont.fontName, currentFont.fontStyle);
  doc.setFontSize(currentFontSize);
  
  // Apply to all pages if not specified to current page only
  if (!options?.currentPage) {
    const pageCount = doc.getNumberOfPages();
    // We start from 2 since we already applied it to the first page
    for (let i = 2; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Save state on this page
      const pageTextColor = doc.getTextColor();
      const pageFont = doc.getFont();
      const pageFontSize = doc.getFontSize();
      
      // Apply watermark
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      
      doc.text(text, 105, 150, { 
        align: 'center',
        angle: angle
      });
      
      // Restore page state
      doc.setTextColor(pageTextColor);
      doc.setFont(pageFont.fontName, pageFont.fontStyle);
      doc.setFontSize(pageFontSize);
    }
    
    // Return to first page
    doc.setPage(1);
  }
};

/**
 * Format currency values for display
 */
const formatCurrency = (amount: number | undefined, currency: string): string => {
  if (amount === undefined) return '';
  
  // Handle cryptocurrencies that might not be supported by Intl.NumberFormat
  if (currency === 'USDC' || currency === 'USDT' || currency === 'SOL' || 
      !['USD', 'EUR', 'GBP', 'CHF'].includes(currency)) {
    return `${amount.toFixed(2)} ${currency}`;
  }

  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  } catch (error) {
    console.error(`Error formatting currency ${currency}:`, error);
    return `${amount.toFixed(2)} ${currency}`;
  }
};

/**
 * Generate a transaction history PDF statement
 */
/**
 * Generate a comprehensive user data export PDF
 * This function is used for GDPR compliance and admin exports
 * Updated to return a Promise for async operation
 */
export const generateUserDataExportPDF = async (
  userData: any,
  translationFn?: (key: string) => string,
  language: string = 'en'
): Promise<void> => {
  // If translation function is not provided, use this comprehensive fallback with multilingual support
  const t = translationFn || ((key: string) => {
    // Multilingual translations for critical fields
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'user_data_export_title': 'GDPR User Data Export',
        'user_data_export_subject': 'EvokeEssence User Data Export - GDPR Compliance',
        'gdpr_data_export': 'User Data Export (GDPR)',
        'export_date': 'Export Date',
        'reference_id': 'Reference ID',
        'gdpr_export_note': 'Data Protection Note',
        'gdpr_data_notice': 'Exported per user request in compliance with GDPR Article 15',
        'personal_data': 'Personal Data',
        'client_id': 'Client ID',
        'username': 'Username',
        'user_email': 'Email',
        'user_full_name': 'Full Name',
        'user_phone': 'Phone',
        'user_address': 'Address',
        'transaction_history': 'Transaction History',
        'sepaDeposits': 'SEPA Deposits',
        'usdtOrders': 'USDT Orders',
        'usdcOrders': 'USDC Orders',
        'id': 'ID',
        'amount': 'Amount',
        'currency': 'Currency',
        'status': 'Status',
        'date': 'Date',
        'kyc_documents': 'KYC Documents',
        'type': 'Type',
        'uploaded': 'Uploaded',
        'reviewed': 'Reviewed',
        'data_export_disclaimer': 'This document contains personal data exported in accordance with GDPR Article 15. This data is confidential and intended only for the named recipient.',
        'page': 'Page',
        'of': 'of',
        'scan_to_verify': 'Scan to verify authenticity',
        'company_reg': 'Registration No.: 22490035',
        'company_vat': 'VAT ID: CZ22490035',
        'legal_notice': 'This document is created electronically and is valid without signature.'
      },
      'de': {
        'user_data_export_title': 'DSGVO Nutzerdatenexport',
        'user_data_export_subject': 'EvokeEssence Nutzerdatenexport - DSGVO-Konformität',
        'gdpr_data_export': 'Nutzerdatenexport (DSGVO)',
        'export_date': 'Exportdatum',
        'reference_id': 'Referenznummer',
        'gdpr_export_note': 'Datenschutzhinweis',
        'gdpr_data_notice': 'Exportiert auf Anfrage des Nutzers gemäß DSGVO Artikel 15',
        'personal_data': 'Persönliche Daten',
        'client_id': 'Kundennummer',
        'username': 'Benutzername',
        'user_email': 'E-Mail',
        'user_full_name': 'Vollständiger Name',
        'user_phone': 'Telefon',
        'user_address': 'Adresse',
        'transaction_history': 'Transaktionsverlauf',
        'sepaDeposits': 'SEPA-Einzahlungen',
        'usdtOrders': 'USDT-Aufträge',
        'usdcOrders': 'USDC-Aufträge',
        'id': 'ID',
        'amount': 'Betrag',
        'currency': 'Währung',
        'status': 'Status',
        'date': 'Datum',
        'kyc_documents': 'KYC-Dokumente',
        'type': 'Typ',
        'uploaded': 'Hochgeladen',
        'reviewed': 'Überprüft',
        'data_export_disclaimer': 'Dieses Dokument enthält persönliche Daten, die gemäß Artikel 15 der DSGVO exportiert wurden. Diese Daten sind vertraulich und nur für den genannten Empfänger bestimmt.',
        'page': 'Seite',
        'of': 'von',
        'scan_to_verify': 'Scannen zur Überprüfung der Echtheit',
        'company_reg': 'Handelsregisternummer: 22490035',
        'company_vat': 'USt-IdNr.: CZ22490035',
        'legal_notice': 'Dieses Dokument wird elektronisch erstellt und ist ohne Unterschrift gültig.'
      },
      'cs': {
        'user_data_export_title': 'Export dat uživatele dle GDPR',
        'user_data_export_subject': 'EvokeEssence Export dat uživatele - soulad s GDPR',
        'gdpr_data_export': 'Export dat uživatele (GDPR)',
        'export_date': 'Datum exportu',
        'reference_id': 'Referenční číslo',
        'gdpr_export_note': 'Poznámka k ochraně dat',
        'gdpr_data_notice': 'Exportováno na žádost uživatele v souladu s článkem 15 GDPR',
        'personal_data': 'Osobní údaje',
        'client_id': 'ID klienta',
        'username': 'Uživatelské jméno',
        'user_email': 'E-mail',
        'user_full_name': 'Celé jméno',
        'user_phone': 'Telefon',
        'user_address': 'Adresa',
        'transaction_history': 'Historie transakcí',
        'sepaDeposits': 'SEPA Vklady',
        'usdtOrders': 'USDT Objednávky',
        'usdcOrders': 'USDC Objednávky',
        'id': 'ID',
        'amount': 'Částka',
        'currency': 'Měna',
        'status': 'Stav',
        'date': 'Datum',
        'kyc_documents': 'KYC Dokumenty',
        'type': 'Typ',
        'uploaded': 'Nahráno',
        'reviewed': 'Zkontrolováno',
        'data_export_disclaimer': 'Tento dokument obsahuje osobní údaje exportované v souladu s článkem 15 GDPR. Tyto údaje jsou důvěrné a určené pouze pro jmenovaného příjemce.',
        'page': 'Strana',
        'of': 'z',
        'scan_to_verify': 'Naskenujte pro ověření pravosti',
        'company_reg': 'IČO: 22490035',
        'company_vat': 'DIČ: CZ22490035',
        'legal_notice': 'Tento dokument je vytvořen elektronicky a je platný bez podpisu.'
      }
    };
    
    // Select language dictionary or fall back to English
    const langDict = translations[language] || translations['en'];
    
    // Return translation or key if not found
    return langDict[key] || key;
  });
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add metadata with GDPR compliance information
    doc.setProperties({
      title: t('user_data_export_title'),
      subject: t('user_data_export_subject'),
      author: 'EvokeEssence s.r.o.',
      creator: 'EvokeEssence Exchange',
      keywords: 'GDPR, Data Protection, User Data, EvokeEssence'
    });
    
    // Set document colors
    const primaryColor = '#1E40AF';
    const secondaryColor = '#4F6BBA';
    
    // Add company header with logo
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('EvokeEssence Exchange', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(t('gdpr_data_export') || 'User Data Export (GDPR)', 105, 25, { align: 'center' });
    
    // Add company address with proper formatting
    doc.setFontSize(9);
    doc.setCharSpace(0); // Remove character spacing to prevent letter spacing issues
    doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 105, 35, { align: 'center' });
    // Add company identifiers
    doc.setFontSize(8);
    doc.text('Registration No.: 22490035, VAT ID: CZ22490035', 105, 39, { align: 'center' });
    
    // Generate reference number with date prefix for improved traceability
    const timestamp = new Date();
    const referenceId = `GDPR-${format(timestamp, 'yyyyMMdd')}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    // Add export info with standardized format
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`${t('export_date')}: ${format(timestamp, 'PPP')}`, 20, 50);
    doc.text(`${t('reference_id') || 'Reference ID'}: ${referenceId}`, 20, 55);
    doc.text(`${t('gdpr_export_note') || 'Data Protection Note'}: ${t('gdpr_data_notice') || 'Exported per user request in compliance with GDPR Article 15'}`, 20, 60);
    
    // Generate verification QR code
    try {
      // Create verification URL with the reference ID
      const verificationUrl = `https://evokeessence.com/verify/${referenceId}`;
      
      // Generate QR code with improved parameters
      // Now using await for proper async handling
      const url = await qrcode.toDataURL(verificationUrl, {
        margin: 1,
        width: 90,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Add QR code as image with improved size and positioning
      doc.addImage(url, 'PNG', 165, 45, 30, 30);
      
      // Add verification text in the selected language
      doc.setFontSize(7);
      doc.setTextColor(40, 40, 40);
      doc.text(t('scan_to_verify'), 180, 78, { align: 'center' });
    } catch (error) {
      console.error('QR code rendering error in GDPR export:', error);
      // Provide a fallback indicator if QR code fails
      doc.setFillColor(220, 220, 220);
      doc.rect(165, 45, 30, 30, 'F');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('QR Code', 180, 60, { align: 'center' });
      doc.text('Unavailable', 180, 65, { align: 'center' });
    }
    
    // User identification section with improved styling
    doc.setFillColor(240, 240, 250);
    doc.rect(15, 65, 180, 25, 'F');
    doc.setFillColor(secondaryColor);
    doc.rect(15, 65, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`${t('personal_data') || 'Personal Data'}`, 20, 70);
    
    // Add user personal data
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    let userInfoY = 77;
    
    // Check if userData has user property (from the API) or use userData directly
    const userInfo = userData.user || userData;
    
    doc.text(`${t('client_id') || 'Client ID'}: ${userInfo.id || 'N/A'}`, 20, userInfoY);
    userInfoY += 5;
    doc.text(`${t('username') || 'Username'}: ${userInfo.username || 'N/A'}`, 20, userInfoY);
    userInfoY += 5;
    
    if (userInfo.email) {
      doc.text(`${t('user_email') || 'Email'}: ${userInfo.email}`, 20, userInfoY);
      userInfoY += 5;
    }
    
    if (userInfo.fullName) {
      doc.text(`${t('user_full_name') || 'Full Name'}: ${userInfo.fullName}`, 120, 77);
    }
    
    if (userInfo.phoneNumber) {
      doc.text(`${t('user_phone') || 'Phone'}: ${userInfo.phoneNumber}`, 120, 82);
    }
    
    if (userInfo.address || userInfo.countryOfResidence) {
      doc.text(`${t('user_address') || 'Address'}: ${userInfo.address || ''} ${userInfo.countryOfResidence || ''}`, 120, 87);
    }
    
    // Set starting position for detailed data tables
    let yPosition = 95;
    
    // Add transaction data section
    if (userData.transactions) {
      // Start a new page if we're running out of space
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.text(`${t('transaction_history')}`, 20, yPosition);
      yPosition += 10;
      
      // Process each transaction type
      const transactionTypes = ['sepaDeposits', 'usdtOrders', 'usdcOrders'];
      
      for (const txType of transactionTypes) {
        if (userData.transactions[txType] && userData.transactions[txType].length > 0) {
          // Add a new page if needed
          if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(12);
          doc.setTextColor(primaryColor);
          doc.text(`${t(txType)}`, 20, yPosition);
          yPosition += 8;
          
          const transactions = userData.transactions[txType];
          
          // Create table data
          const txTableBody = transactions.map((tx: any) => {
            return [
              tx.id,
              tx.amount ? tx.amount.toString() : 'N/A',
              tx.currency || 'N/A',
              tx.status || 'N/A',
              tx.createdAt ? format(new Date(tx.createdAt), 'PPP') : 'N/A'
            ];
          });
          
          autoTable(doc, {
            head: [[
              t('id'),
              t('amount'),
              t('currency'),
              t('status'),
              t('date')
            ]],
            body: txTableBody,
            startY: yPosition,
            theme: 'striped',
            headStyles: {
              fillColor: [30, 64, 175],
              textColor: 255,
              fontStyle: 'bold'
            },
            styles: {
              fontSize: 8
            }
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      }
    }
    
    // Add documents section if available
    if (userData.documents && userData.documents.kycDocuments && userData.documents.kycDocuments.length > 0) {
      // Start a new page if we're running out of space
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.text(`${t('kyc_documents')}`, 20, yPosition);
      yPosition += 10;
      
      const documents = userData.documents.kycDocuments;
      
      // Create table data for documents
      const docTableBody = documents.map((doc: any) => {
        return [
          doc.id,
          doc.documentType || 'N/A',
          doc.status || 'N/A',
          doc.uploadedAt ? format(new Date(doc.uploadedAt), 'PPP') : 'N/A',
          doc.reviewedAt ? format(new Date(doc.reviewedAt), 'PPP') : 'N/A'
        ];
      });
      
      autoTable(doc, {
        head: [[
          t('id'),
          t('type'),
          t('status'),
          t('uploaded'),
          t('reviewed')
        ]],
        body: docTableBody,
        startY: yPosition,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8
        }
      });
    }
    
    // Add footer with page number and legal text
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Legal disclaimer at bottom
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        t('data_export_disclaimer'),
        105, 
        285, 
        { align: 'center', maxWidth: 180 }
      );
      
      // Page number
      doc.text(
        `${t('page')} ${i} ${t('of')} ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }
    
    // Download the PDF
    // Use our robust multi-tier download with fallbacks
    await downloadPDFWithFallbacks(doc, `EvokeEssence_UserData_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Error generating user data PDF:', error);
    alert('Failed to generate user data export PDF. Please try again later.');
  }
};

/**
 * Generate a bank statement-style PDF for transaction history
 * Supports multiple languages (English, German, Czech)
 * @param transactions - Array of transaction data
 * @param userData - User account information
 * @param translationFn - Function to get translated text
 * @param language - Language code (en, de, cs)
 */
export const generateBankStatementPDF = async (
  transactions: Transaction[],
  userData: UserData,
  translationFn?: (key: string) => string,
  language: string = 'en'
): Promise<void> => {
  // If translation function is not provided, use this comprehensive fallback
  // with support for English, German and Czech languages
  const t = translationFn || ((key: string) => {
    // Multilingual translations for critical fields
    const translations: Record<string, Record<string, string>> = {
      'en': {
        'bank_statement_title': 'Bank Statement',
        'bank_statement': 'Bank Statement',
        'statement_info': 'Statement Information',
        'statement_date': 'Statement Date',
        'statement_id': 'Statement ID',
        'statement_period': 'Statement Period',
        'client_information': 'Client Information',
        'client_id': 'Client ID',
        'username': 'Username',
        'user_full_name': 'Full Name',
        'user_email': 'Email',
        'user_address': 'Address',
        'account_summary': 'Account Summary',
        'balance_eur': 'EUR Balance',
        'balance_usd': 'USD Balance',
        'balance_gbp': 'GBP Balance',
        'balance_chf': 'CHF Balance',
        'total_deposits': 'Total Deposits',
        'total_withdrawals': 'Total Withdrawals',
        'transactions': 'Transactions',
        'date': 'Date',
        'type_reference': 'Type/Reference',
        'initial_amount': 'Initial Amount',
        'commission_fee': 'Commission Fee',
        'final_amount': 'Final Amount',
        'status': 'Status',
        'status_completed': 'Completed',
        'status_pending': 'Pending',
        'status_failed': 'Failed',
        'tx_type_deposit': 'Deposit',
        'tx_type_withdrawal': 'Withdrawal',
        'tx_type_usdt': 'USDT Order',
        'tx_type_usdc': 'USDC Order',
        'page': 'Page',
        'of': 'of',
        'confidential': 'CONFIDENTIAL',
        'company_name': 'EvokeEssence s.r.o.',
        'company_reg': 'Registration No.: 22490035',
        'company_vat': 'VAT ID: CZ22490035',
        'authorized_document': 'This is an authorized financial document',
        'legal_notice': 'This document is created electronically and is valid without signature.',
        'contact_support': 'For inquiries regarding this statement, contact support@evokeessence.com'
      },
      'de': {
        'bank_statement_title': 'Kontoauszug',
        'bank_statement': 'Kontoauszug',
        'statement_info': 'Auszugsinformationen',
        'statement_date': 'Auszugsdatum',
        'statement_id': 'Auszugsnummer',
        'statement_period': 'Auszugszeitraum',
        'client_information': 'Kundeninformationen',
        'client_id': 'Kundennummer',
        'username': 'Benutzername',
        'user_full_name': 'Vollständiger Name',
        'user_email': 'E-Mail',
        'user_address': 'Adresse',
        'account_summary': 'Kontoübersicht',
        'balance_eur': 'EUR Guthaben',
        'balance_usd': 'USD Guthaben',
        'balance_gbp': 'GBP Guthaben',
        'balance_chf': 'CHF Guthaben',
        'total_deposits': 'Gesamteinzahlungen',
        'total_withdrawals': 'Gesamtauszahlungen',
        'transactions': 'Transaktionen',
        'date': 'Datum',
        'type_reference': 'Typ/Referenz',
        'initial_amount': 'Ursprungsbetrag',
        'commission_fee': 'Kommissionsgebühr',
        'final_amount': 'Endbetrag',
        'status': 'Status',
        'status_completed': 'Abgeschlossen',
        'status_pending': 'Ausstehend',
        'status_failed': 'Fehlgeschlagen',
        'tx_type_deposit': 'Einzahlung',
        'tx_type_withdrawal': 'Auszahlung',
        'tx_type_usdt': 'USDT Auftrag',
        'tx_type_usdc': 'USDC Auftrag',
        'page': 'Seite',
        'of': 'von',
        'confidential': 'VERTRAULICH',
        'company_name': 'EvokeEssence s.r.o.',
        'company_reg': 'Handelsregisternummer: 22490035',
        'company_vat': 'USt-IdNr.: CZ22490035',
        'authorized_document': 'Dies ist ein autorisiertes Finanzdokument',
        'legal_notice': 'Dieses Dokument wird elektronisch erstellt und ist ohne Unterschrift gültig.',
        'contact_support': 'Bei Fragen zu diesem Auszug wenden Sie sich bitte an support@evokeessence.com'
      },
      'cs': {
        'bank_statement_title': 'Bankovní výpis',
        'bank_statement': 'Bankovní výpis',
        'statement_info': 'Informace o výpisu',
        'statement_date': 'Datum výpisu',
        'statement_id': 'Číslo výpisu',
        'statement_period': 'Období výpisu',
        'client_information': 'Informace o klientovi',
        'client_id': 'ID klienta',
        'username': 'Uživatelské jméno',
        'user_full_name': 'Celé jméno',
        'user_email': 'E-mail',
        'user_address': 'Adresa',
        'account_summary': 'Přehled účtu',
        'balance_eur': 'Zůstatek EUR',
        'balance_usd': 'Zůstatek USD',
        'balance_gbp': 'Zůstatek GBP',
        'balance_chf': 'Zůstatek CHF',
        'total_deposits': 'Celkové vklady',
        'total_withdrawals': 'Celkové výběry',
        'transactions': 'Transakce',
        'date': 'Datum',
        'type_reference': 'Typ/Reference',
        'initial_amount': 'Původní částka',
        'commission_fee': 'Poplatek',
        'final_amount': 'Konečná částka',
        'status': 'Stav',
        'status_completed': 'Dokončeno',
        'status_pending': 'Čekající',
        'status_failed': 'Selhalo',
        'tx_type_deposit': 'Vklad',
        'tx_type_withdrawal': 'Výběr',
        'tx_type_usdt': 'USDT Objednávka',
        'tx_type_usdc': 'USDC Objednávka',
        'page': 'Strana',
        'of': 'z',
        'confidential': 'DŮVĚRNÉ',
        'company_name': 'EvokeEssence s.r.o.',
        'company_reg': 'IČO: 22490035',
        'company_vat': 'DIČ: CZ22490035',
        'authorized_document': 'Toto je autorizovaný finanční dokument',
        'legal_notice': 'Tento dokument je vytvořen elektronicky a je platný bez podpisu.',
        'contact_support': 'Pro dotazy ohledně tohoto výpisu kontaktujte support@evokeessence.com'
      }
    };
    
    // Select language dictionary or fall back to English
    const langDict = translations[language] || translations['en'];
    
    // Return translation or key if not found
    return langDict[key] || key;
  });
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add metadata with enhanced information
    doc.setProperties({
      title: t('bank_statement_title'),
      subject: `EvokeEssence ${t('bank_statement')}`,
      author: 'EvokeEssence s.r.o.',
      creator: 'EvokeEssence Exchange',
      keywords: 'bank statement, financial document, transaction history, EvokeEssence'
    });
    
    // Set document colors - using a professional blue palette
    const primaryColor = '#0A2463'; // Darker blue for main elements
    const secondaryColor = '#247BA0'; // Medium blue for secondary elements
    const accentColor = '#1E5F74'; // Accent blue for highlights
    const lightBgColor = '#EEF2F5'; // Light blue-gray for backgrounds
    
    // Generate unique statement ID with date prefix and verification code
    const timestamp = new Date();
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const statementId = `EEST-${format(timestamp, 'yyyyMMdd')}-${verificationCode}`;
    
    // Add professional header with gradient-like effect
    // Create darker header bar
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Add decorative accent line
    doc.setFillColor(accentColor);
    doc.rect(0, 40, 210, 2, 'F');
    
    // Add company name and document title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EvokeEssence Exchange', 105, 18, { align: 'center' });
    
    // Add document type with slightly smaller size
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(t('bank_statement'), 105, 28, { align: 'center' });
    
    // Add company address with smaller size and proper formatting
    doc.setFontSize(9);
    doc.setCharSpace(0); // Remove character spacing to prevent letter spacing issues
    doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 105, 35, { align: 'center' });
    // Add company identifiers
    doc.setFontSize(8);
    doc.text('Registration No.: 22490035, VAT ID: CZ22490035', 105, 39, { align: 'center' });
    
    // Add professional watermark using the utility function
    addProfessionalWatermark(doc, t('confidential'), {
      color: [200, 200, 200],
      fontSize: 40,
      angle: 315
    });
    
    // Add statement info with improved styling
    doc.setTextColor(primaryColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(t('statement_info'), 20, 50);
    
    // Format date according to locale
    let dateFormat: string;
    switch(language) {
      case 'de':
        dateFormat = 'dd.MM.yyyy';
        break;
      case 'cs':
        dateFormat = 'd. M. yyyy';
        break;
      default: // 'en'
        dateFormat = 'MM/dd/yyyy';
        break;
    }
    
    // Add statement details with better formatting
    const statementDate = format(timestamp, dateFormat);
    const periodStart = format(new Date(timestamp.getFullYear(), timestamp.getMonth(), 1), dateFormat);
    const periodEnd = statementDate;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Create a small box for statement details
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 52, 180, 20, 2, 2, 'F');
    
    doc.text(`${t('statement_date')}: ${statementDate}`, 20, 59);
    doc.text(`${t('statement_id')}: ${statementId}`, 20, 65);
    doc.text(`${t('statement_period')}: ${periodStart} - ${periodEnd}`, 120, 59);
    
    // Generate verification QR code with statement ID for authenticity verification
    try {
      // Create verification URL with the statement ID
      const verificationUrl = `https://evokeessence.com/verify/${statementId}`;
      
      // Generate QR code with proper async/await handling
      const url = await qrcode.toDataURL(verificationUrl, {
        margin: 0,
        width: 60,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Add QR code as image
      doc.addImage(url, 'PNG', 170, 52, 20, 20);
      
      // Add verification text in the selected language
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text('Verify with QR', 180, 75, { align: 'center' });
    } catch (error) {
      console.error('QR code rendering error:', error);
      // Fallback graphic if QR code generation fails
      doc.setFillColor(primaryColor);
      doc.rect(175, 65, 12, 12, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(178, 68, 6, 2, 'F');
      doc.rect(178, 72, 6, 2, 'F');
    }
    
    // Add client info section with enhanced styling
    doc.setFillColor(primaryColor);
    doc.rect(15, 80, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('client_information')}`, 20, 86);
    
    // Add client info box with rounded corners and subtle shadow effect
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 88, 180, 30, 2, 2, 'F');
    
    // Add client data with improved layout (two columns)
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column
    doc.text(`${t('client_id')}:`, 20, 96);
    doc.text(`${t('username')}:`, 20, 102);
    if (userData.fullName) {
      doc.text(`${t('user_full_name')}:`, 20, 108);
    }
    
    // Right column titles
    if (userData.email) {
      doc.text(`${t('user_email')}:`, 105, 96);
    }
    if (userData.phoneNumber) {
      doc.text(`${t('user_phone')}:`, 105, 102);
    }
    if (userData.address) {
      doc.text(`${t('user_address')}:`, 105, 108);
    }
    
    // Left column values with bold styling
    doc.setFont('helvetica', 'bold');
    doc.text(`${userData.id}`, 45, 96);
    doc.text(`${userData.username}`, 45, 102);
    if (userData.fullName) {
      doc.text(`${userData.fullName}`, 45, 108);
    }
    
    // Right column values with bold styling
    if (userData.email) {
      doc.text(`${userData.email}`, 130, 96);
    }
    if (userData.phoneNumber) {
      doc.text(`${userData.phoneNumber}`, 130, 102);
    }
    if (userData.address) {
      doc.text(`${userData.address}`, 130, 108);
    }
    
    // Add account balance section with improved styling
    doc.setFillColor(primaryColor);
    doc.rect(15, 125, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('account_summary')}`, 20, 131);
    
    // Add balance box with rounded corners
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 133, 180, 20, 2, 2, 'F');
    
    // Handle either single balance or multiple balances
    let balanceY = 125;
    if (userData.balances && userData.balances.length > 0) {
      userData.balances.forEach((balance, index) => {
        doc.text(`${t('balance_' + balance.currency.toLowerCase())}: ${formatCurrency(balance.amount, balance.currency)}`, 20, balanceY + (index * 5));
      });
    } else if (userData.balance !== undefined && userData.balanceCurrency) {
      doc.text(`${t('balance_' + userData.balanceCurrency.toLowerCase())}: ${formatCurrency(userData.balance, userData.balanceCurrency)}`, 20, balanceY);
    }
    
    // Calculate transaction summaries
    const depositSum = transactions
      .filter(t => t.type.toLowerCase().includes('deposit') && t.status.toLowerCase() === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const withdrawalSum = transactions
      .filter(t => t.type.toLowerCase().includes('withdrawal') && t.status.toLowerCase() === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Show transaction summaries  
    const mainCurrency = userData.balanceCurrency || 
      (userData.balances && userData.balances.length > 0 ? userData.balances[0].currency : 'EUR');
    
    doc.text(`${t('total_deposits')}: ${formatCurrency(depositSum, mainCurrency)}`, 120, balanceY);
    doc.text(`${t('total_withdrawals')}: ${formatCurrency(withdrawalSum, mainCurrency)}`, 120, balanceY + 5);
    
    // Prepare data for transactions table with localized formatting
    const tableData = transactions.map(transaction => {
      // For SEPA deposits, initial amount is original amount before commission
      const isDeposit = transaction.type.toLowerCase().includes('deposit');
      
      // Calculate the correct amounts to display
      let initialAmount, commissionAmount, totalAmount;
      
      if (isDeposit) {
        // For deposits:
        // 1. Initial amount is the original deposit BEFORE commission deduction
        // 2. Commission amount is the fee taken
        // 3. Total amount is the amount AFTER commission (what user receives)
        
        if (transaction.initialAmount) {
          // If we already have the initial amount stored, use it directly
          initialAmount = transaction.initialAmount;
        } else {
          // Otherwise, calculate it by adding commission back to the amount
          // The amount field contains what's left after commission is deducted
          initialAmount = transaction.amount + (transaction.commissionAmount || 0);
        }
        
        commissionAmount = transaction.commissionAmount || 0;
        totalAmount = transaction.amount; // This is the post-commission amount
      } else {
        // For other transactions, use what we have or fall back to amount
        initialAmount = transaction.initialAmount || transaction.amount;
        commissionAmount = transaction.commissionAmount || 0;
        totalAmount = transaction.totalAmount || transaction.amount;
      }
      
      // Format date according to locale
      const txDate = format(new Date(transaction.createdAt), dateFormat);
      
      // Format transaction type with localization
      let txType = t(`tx_type_${transaction.type.toLowerCase()}`);
      if (!txType.includes('tx_type_')) {
        // If translation exists, use it, otherwise fallback to original
        txType = transaction.type;
      }
      
      return [
        txDate,
        `${txType}${transaction.reference ? ` / ${transaction.reference}` : ''}`,
        formatCurrency(initialAmount, transaction.currency),
        formatCurrency(commissionAmount, transaction.currency),
        formatCurrency(totalAmount, transaction.currency),
        t(`status_${transaction.status.toLowerCase()}`)
      ];
    });
    
    // Add transactions table
    autoTable(doc, {
      head: [[
        t('date'),
        t('type_reference'),
        t('initial_amount'),
        t('commission_fee'),
        t('final_amount'),
        t('status')
      ]],
      body: tableData,
      startY: 142,
      headStyles: {
        fillColor: [30, 64, 175], // primaryColor in RGB
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 240, 250]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 40 }, // Type/Reference
        2: { cellWidth: 35 }, // Initial Amount
        3: { cellWidth: 35 }, // Commission
        4: { cellWidth: 35 }, // Total Amount
        5: { cellWidth: 20 }  // Status
      },
      margin: { top: 145 },
      didDrawPage: function(data: any) {
        // Add a table header on each page - with safer type handling
        // Check if we have data, we're not on the first page, and we're at the top of a page
        if (data && 
            typeof data.pageNumber === 'number' && 
            data.pageNumber > 1 && 
            data.cursor && 
            typeof data.cursor.y === 'number' && 
            typeof data.settings?.margin?.top === 'number' &&
            data.cursor.y === data.settings.margin.top) {
          
          doc.setFillColor(secondaryColor);
          doc.rect(data.settings.margin.left - 2, data.settings.margin.top - 8, 180, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.text(`${t('transaction_list')}`, data.settings.margin.left, data.settings.margin.top - 3);
        }
      }
    });
    
    // Add footer with page number and legal text
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add company info at footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('EvokeEssence s.r.o.', 20, 280);
      doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 20, 285);
      doc.text('Registration ID: 22490035', 20, 290);
      
      // Legal disclaimer at bottom
      doc.text(
        t('statement_disclaimer'),
        105, 
        285, 
        { align: 'center', maxWidth: 120 }
      );
      
      // Page number
      doc.text(
        `${t('page')} ${i} ${t('of')} ${pageCount}`,
        180,
        290,
        { align: 'right' }
      );
    }
    
    // Use filename with language code and date
    // Use the enhanced PDF download system with fallbacks
    await downloadPDFWithFallbacks(doc, `EvokeEssence_Statement_${language.toUpperCase()}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Error generating bank statement PDF:', error);
    alert(t('pdf_generation_error'));
  }
};

/**
 * Generate a transaction history PDF statement
 */
export const generateTransactionPDF = async (
  transactions: Transaction[],
  userData: UserData,
  translationFn?: (key: string) => string,
  language: string = 'en'
): Promise<void> => {
  // If translation function is not provided, use this simple fallback
  const t = translationFn || ((key: string) => {
    // Basic translations for critical fields
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
      'balance_eur': 'EUR Balance',
      'balance_usd': 'USD Balance',
      'balance_gbp': 'GBP Balance',
      'balance_chf': 'CHF Balance',
      'transaction_list': 'Transaction List',
      'total_transactions': 'Total Transactions',
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
      'status_successful': 'Successful',
      'status_pending': 'Pending',
      'status_failed': 'Failed',
      'statement_disclaimer': 'This statement is an official record of transactions. For questions, contact customer service.',
      'confidential': 'CONFIDENTIAL'
    };
    return translations[key] || key;
  });
  
  // Format date according to locale
  let dateFormat: string;
  switch(language) {
    case 'de':
      dateFormat = 'dd.MM.yyyy';
      break;
    case 'cs':
      dateFormat = 'd. M. yyyy';
      break;
    default: // 'en'
      dateFormat = 'MM/dd/yyyy';
      break;
  }
  
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Add enhanced metadata for better document identification
    doc.setProperties({
      title: t('transaction_history_title'),
      subject: t('transaction_history_subject'),
      author: 'EvokeEssence s.r.o.',
      creator: 'EvokeEssence Exchange',
      keywords: 'transactions, history, statement, crypto, financial report, EvokeEssence'
    });
    
    // Set document colors - professional financial color scheme
    const primaryColor = '#0A2463'; // Darker blue for main elements
    const secondaryColor = '#247BA0'; // Medium blue for secondary elements
    const accentColor = '#1E5F74'; // Accent blue for highlights
    const lightBgColor = '#EEF2F5'; // Light blue-gray for backgrounds
    
    // Generate unique statement ID with timestamp for tracking and verification code
    const timestamp = new Date();
    const verificationCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const statementId = `TX-${format(timestamp, 'yyyyMMdd')}-${verificationCode}`;
    
    // Add professional header with enhanced design
    // Main header background
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Add decorative accent line
    doc.setFillColor(accentColor);
    doc.rect(0, 40, 210, 2, 'F');
    
    // Add company name and document title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EvokeEssence Exchange', 105, 18, { align: 'center' });
    
    // Add document type with slightly smaller size
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(t('transaction_report'), 105, 28, { align: 'center' });
    
    // Add company address with smaller size and proper formatting
    doc.setFontSize(9);
    doc.setCharSpace(0); // Remove character spacing to prevent letter spacing issues
    doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 105, 35, { align: 'center' });
    // Add company identifiers
    doc.setFontSize(8);
    doc.text('Registration No.: 22490035, VAT ID: CZ22490035', 105, 39, { align: 'center' });
    
    // Add professional watermark using the utility function
    addProfessionalWatermark(doc, t('confidential'), {
      color: [200, 200, 200],
      fontSize: 40,
      angle: 315
    });
    
    // Add statement info section header
    doc.setTextColor(primaryColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(t('statement_info'), 20, 50);
    
    // Create statement details panel with rounded corners
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 52, 180, 20, 2, 2, 'F');
    
    // Add statement details
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Determine the statement period (last 30 days by default)
    const periodStart = format(new Date(timestamp.getFullYear(), timestamp.getMonth(), 1), dateFormat);
    const periodEnd = format(timestamp, dateFormat);
    
    // Add statement information in a two-column layout
    doc.text(`${t('statement_date')}:`, 20, 59);
    doc.text(`${t('statement_id')}:`, 20, 65);
    doc.text(`${t('statement_period')}:`, 120, 59);
    
    // Add values in bold
    doc.setFont('helvetica', 'bold');
    doc.text(format(timestamp, dateFormat), 60, 59);
    doc.text(statementId, 60, 65);
    doc.text(`${periodStart} - ${periodEnd}`, 160, 59);
    
    // Add company logo simulation in corner - moved to prevent text overlay
    doc.setFillColor(primaryColor);
    doc.rect(175, 65, 12, 12, 'F');
    doc.setFillColor(255, 255, 255);
    
    // Generate QR code for statement verification
    try {
      // Create verification URL with the statement ID
      const verificationUrl = `https://evokeessence.com/verify/${statementId}`;
      
      // Generate QR code with proper async handling and error capture
      console.log('Generating QR code for verification URL:', verificationUrl);
      const url = await qrcode.toDataURL(verificationUrl, {
        margin: 0,
        width: 60,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // Higher error correction for better scanning
      });
      
      if (!url) {
        throw new Error('QR code generation returned empty data URL');
      }
      
      console.log('QR code generated successfully, adding to PDF');
      
      // Add QR code as image
      doc.addImage(url, 'PNG', 170, 52, 20, 20);
      
      // Add verification text in the selected language
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text('Verify with QR', 180, 75, { align: 'center' });
      
      console.log('QR code added to PDF document');
    } catch (error) {
      console.error('QR code rendering error:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Fallback pattern if QR code generation fails
      doc.rect(178, 68, 6, 2, 'F');
      doc.rect(178, 72, 6, 2, 'F');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text('Verification Available Online', 180, 75, { align: 'center' });
    };
    
    // Add client info section with enhanced styling
    doc.setFillColor(primaryColor);
    doc.rect(15, 80, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('client_information')}`, 20, 86);
    
    // Client info panel with subtle shadow effect (using multiple rectangles)
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 88, 180, 30, 2, 2, 'F');
    
    // Add client data with two-column layout
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column labels
    doc.text(`${t('client_id')}:`, 20, 96);
    doc.text(`${t('username')}:`, 20, 103);
    if (userData.fullName) {
      doc.text(`${t('user_full_name')}:`, 20, 110);
    }
    
    // Right column labels
    if (userData.email) {
      doc.text(`${t('user_email')}:`, 105, 96);
    }
    if (userData.phoneNumber) {
      doc.text(`${t('user_phone')}:`, 105, 103);
    }
    if (userData.address) {
      doc.text(`${t('user_address')}:`, 105, 110);
    }
    
    // Left column values in bold
    doc.setFont('helvetica', 'bold');
    doc.text(`${userData.id}`, 50, 96);
    doc.text(`${userData.username}`, 50, 103);
    if (userData.fullName) {
      doc.text(`${userData.fullName}`, 50, 110);
    }
    
    // Right column values in bold
    if (userData.email) {
      doc.text(`${userData.email}`, 135, 96);
    }
    if (userData.phoneNumber) {
      doc.text(`${userData.phoneNumber}`, 135, 103);
    }
    if (userData.address) {
      doc.text(`${userData.address}`, 135, 110);
    }
    
    // Add account balance section with improved styling
    doc.setFillColor(primaryColor);
    doc.rect(15, 125, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('account_summary')}`, 20, 131);
    
    // Add balance panel
    doc.setFillColor(lightBgColor);
    doc.roundedRect(15, 133, 180, 17, 2, 2, 'F');
    
    // Handle either single balance or multiple balances
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let balanceX = 20;
    let balanceY = 142;
    
    if (userData.balances && userData.balances.length > 0) {
      // Show balances in a horizontal layout if there are multiple currencies
      userData.balances.forEach((balance, index) => {
        // Create a small card for each balance
        if (index > 0 && index % 3 === 0) {
          balanceX = 20;
          balanceY += 15;
        }
        
        const currencyKey = `balance_${balance.currency.toLowerCase()}`;
        const currencyLabel = t(currencyKey) || `${balance.currency} Balance`;
        
        doc.text(currencyLabel + ':', balanceX, balanceY);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(balance.amount, balance.currency), balanceX, balanceY + 5);
        doc.setFont('helvetica', 'normal');
        
        balanceX += 60;
      });
    } else if (userData.balance !== undefined) {
      // Single balance - use balanceCurrency or default to EUR if not available
      const currency = userData.balanceCurrency || 'EUR';
      const currencyKey = `balance_${currency.toLowerCase()}`;
      const currencyLabel = t(currencyKey) || `${currency} Balance`;
      
      doc.text(currencyLabel + ':', 20, balanceY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(userData.balance, currency), 80, balanceY);
      doc.setFont('helvetica', 'normal');
      
      // Add transaction counts on the right
      const completedTxCount = transactions.filter(tx => 
        tx.status.toLowerCase() === 'completed' || 
        tx.status.toLowerCase() === 'successful'
      ).length;
      
      doc.text(`${t('total_transactions')}:`, 120, balanceY);
      doc.setFont('helvetica', 'bold');
      doc.text(`${completedTxCount}/${transactions.length}`, 180, balanceY);
      doc.setFont('helvetica', 'normal');
    }
    
    // Prepare data for transactions table with enhanced display
    // Group transactions by type for better organization
    const cryptoTransactions = transactions.filter(tx => 
      tx.type.toLowerCase().includes('usdt') || 
      tx.type.toLowerCase().includes('usdc') || 
      tx.type.toLowerCase().includes('crypto')
    );
    
    const fiatTransactions = transactions.filter(tx => 
      !tx.type.toLowerCase().includes('usdt') && 
      !tx.type.toLowerCase().includes('usdc') && 
      !tx.type.toLowerCase().includes('crypto')
    );
    
    // Process transaction data with detailed information
    const processTransactionData = (tx: Transaction) => {
      // Calculate proper amounts
      const isDeposit = tx.type.toLowerCase().includes('deposit');
      
      let initialAmount, commissionAmount, totalAmount;
      
      if (isDeposit) {
        if (tx.initialAmount) {
          initialAmount = tx.initialAmount;
        } else {
          initialAmount = tx.amount + (tx.commissionAmount || 0);
        }
        
        commissionAmount = tx.commissionAmount || 0;
        totalAmount = tx.amount;
      } else {
        initialAmount = tx.initialAmount || tx.amount;
        commissionAmount = tx.commissionAmount || 0;
        totalAmount = tx.totalAmount || tx.amount;
      }
      
      // Format transaction type with better display
      let txType = tx.type;
      if (tx.type.toLowerCase().includes('deposit')) {
        txType = t('tx_type_deposit') || 'Deposit';
      } else if (tx.type.toLowerCase().includes('withdrawal')) {
        txType = t('tx_type_withdrawal') || 'Withdrawal';
      } else if (tx.type.toLowerCase().includes('usdt')) {
        txType = t('tx_type_usdt') || 'USDT Order';
      } else if (tx.type.toLowerCase().includes('usdc')) {
        txType = t('tx_type_usdc') || 'USDC Order';
      }
      
      // Format date according to locale
      const formattedDate = format(new Date(tx.createdAt), dateFormat);
      
      // Format status with proper localization
      let status = tx.status.toUpperCase();
      if (tx.status.toLowerCase() === 'completed' || tx.status.toLowerCase() === 'successful') {
        status = t('status_completed') || 'COMPLETED';
      } else if (tx.status.toLowerCase() === 'pending') {
        status = t('status_pending') || 'PENDING';
      } else if (tx.status.toLowerCase() === 'failed') {
        status = t('status_failed') || 'FAILED';
      }
      
      return [
        formattedDate,
        txType,
        tx.reference || '-',
        formatCurrency(initialAmount, tx.currency),
        formatCurrency(commissionAmount, tx.currency),
        formatCurrency(totalAmount, tx.currency),
        status
      ];
    };
    
    // Calculate the start Y position for the tables
    let currentY = 155;
    
    // Add cryptocurrency transactions table if any exist
    if (cryptoTransactions.length > 0) {
      doc.setFillColor(secondaryColor);
      doc.rect(10, currentY, 170, 8, 'F'); // Reduced width from 180 to 170
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); // Reduced font size from 11 to 10
      doc.setFont('helvetica', 'bold');
      doc.text(t('crypto_transactions'), 15, currentY + 6); // Adjusted X position
      currentY += 10;
      
      const cryptoTableData = cryptoTransactions.map(processTransactionData);
      
      autoTable(doc, {
        head: [[
          t('date'),
          t('type'),
          t('reference'),
          t('initial_amount'),
          t('commission_fee'),
          t('final_amount'),
          t('status')
        ]],
        body: cryptoTableData,
        startY: currentY,
        headStyles: {
          fillColor: [36, 123, 160], // secondaryColor in RGB
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [238, 242, 245] // lightBgColor in RGB
        },
        // Reduced column widths to fix the "51 units width could not fit page" error
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Date
          1: { cellWidth: 15, halign: 'left' }, // Type
          2: { cellWidth: 20, halign: 'left' }, // Reference
          3: { cellWidth: 18, halign: 'right' }, // Initial Amount
          4: { cellWidth: 15, halign: 'right' }, // Commission
          5: { cellWidth: 18, halign: 'right' }, // Final Amount
          6: { cellWidth: 20, halign: 'center' }  // Status
        },
        margin: { right: 5, left: 5 }, // Reduce margins to give more space
        styles: { 
          fontSize: 8, // Reduce font size for better fitting
          overflow: 'linebreak' // Handle overflow with line breaks
        },
        didDrawPage: (data) => {
          // Restore the position
          currentY = (doc as any).lastAutoTable.finalY + 10;
        }
      });
    }
    
    // Add fiat transactions table if any exist
    if (fiatTransactions.length > 0) {
      doc.setFillColor(secondaryColor);
      doc.rect(10, currentY, 170, 8, 'F'); // Reduced width from 180 to 170
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); // Reduced font size from 11 to 10
      doc.setFont('helvetica', 'bold');
      doc.text(t('fiat_transactions'), 15, currentY + 6); // Adjusted X position
      currentY += 10;
      
      const fiatTableData = fiatTransactions.map(processTransactionData);
      
      autoTable(doc, {
        head: [[
          t('date'),
          t('type'),
          t('reference'),
          t('initial_amount'),
          t('commission_fee'),
          t('final_amount'),
          t('status')
        ]],
        body: fiatTableData,
        startY: currentY,
        headStyles: {
          fillColor: [36, 123, 160], // secondaryColor in RGB
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [238, 242, 245] // lightBgColor in RGB
        },
        // Reduced column widths to match crypto transactions table and fix width issues
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Date
          1: { cellWidth: 15, halign: 'left' }, // Type
          2: { cellWidth: 20, halign: 'left' }, // Reference
          3: { cellWidth: 18, halign: 'right' }, // Initial Amount
          4: { cellWidth: 15, halign: 'right' }, // Commission
          5: { cellWidth: 18, halign: 'right' }, // Final Amount
          6: { cellWidth: 20, halign: 'center' }  // Status
        },
        margin: { right: 5, left: 5 }, // Reduce margins to give more space
        styles: { 
          fontSize: 8, // Reduce font size for better fitting
          overflow: 'linebreak' // Handle overflow with line breaks
        }
      });
    }
    
    // If no transactions, show a message
    if (transactions.length === 0) {
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(t('no_transactions') || 'No transactions found in the selected period.', 105, 170, { align: 'center' });
    }
    
    // Generate QR code for statement verification with enhanced reliability
    console.log('Generating QR code for verification');
    try {
      // Create verification URL (use a placeholder URL that can be implemented on the backend)
      const verificationUrl = `https://evokeessence.com/verify-pdf?id=${statementId}&type=transaction&lang=${language}`;
      console.log('Verification URL:', verificationUrl);
      
      // Create QR code options with better defaults for display
      const qrOptions = {
        margin: 1,
        width: 100,
        errorCorrectionLevel: 'H', // Highest error correction level for better scanning
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };
      
      // Use Promise-based approach with explicit error handling
      try {
        console.log('Generating QR code with options:', JSON.stringify(qrOptions));
        const qrCodeData = await qrcode.toDataURL(verificationUrl, qrOptions);
        
        // Verify QR data was generated correctly
        if (!qrCodeData || qrCodeData.length < 100) {
          throw new Error('QR code data appears invalid or empty');
        }
        
        console.log('QR code generated successfully, length:', qrCodeData.length);
        
        // Add verification QR code on the first page
        doc.setPage(1);
        doc.addImage(qrCodeData, 'PNG', 165, 45, 30, 30);
        
        // Add verification text
        doc.setFontSize(7);
        doc.setTextColor(40, 40, 40);
        doc.text(t('scan_to_verify') || 'Scan to verify authenticity', 180, 78, { align: 'center' });
        
        console.log('QR code successfully added to PDF');
      } catch (qrRenderError) {
        // Specific handling for QR code rendering failures
        console.error('QR code rendering error:', qrRenderError);
        
        // Create a simple fallback QR box with text
        doc.setPage(1);
        doc.setFillColor(240, 240, 240);
        doc.rect(165, 45, 30, 30, 'F');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('Verification', 180, 55, { align: 'center' });
        doc.text('Code', 180, 60, { align: 'center' });
        doc.text(statementId.substring(0, 8), 180, 65, { align: 'center' });
        
        console.log('Fallback verification box added to PDF');
      }
    } catch (qrError) {
      // This handles any errors in the outer QR code generation process
      console.error('Error in QR code generation process:', qrError);
      // Continue with PDF generation even if QR fails completely
      console.log('Continuing PDF generation despite QR code error');
    }
    
    // Add enhanced footer with company information and disclaimers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add decorative line at bottom
      doc.setDrawColor(accentColor);
      doc.setLineWidth(0.5);
      doc.line(15, 270, 195, 270);
      
      // Add company information in structured layout
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('EvokeEssence s.r.o.', 15, 275);
      doc.setFont('helvetica', 'normal');
      doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 15, 280);
      doc.text('Email: info@evokeessence.com', 15, 285);
      
      // Add company registration details
      doc.text('Registration ID: 22490035', 75, 275);
      doc.text('VAT ID: CZ22490035', 75, 280);
      doc.text('support@evokeessence.com', 75, 285);
      
      // Add financial regulator seal text
      doc.setFont('helvetica', 'bold');
      doc.text('Regulated by Czech National Bank', 145, 275);
      doc.setFont('helvetica', 'normal');
      // Removed license number as requested
      
      // Add page number
      doc.setFontSize(8);
      doc.text(
        `${t('page')} ${i} ${t('of')} ${pageCount}`,
        195,
        290,
        { align: 'right' }
      );
      
      // Add generated date at bottom of each page
      doc.text(
        `${t('generated')}: ${format(timestamp, 'yyyy-MM-dd HH:mm')}`,
        15,
        290
      );
      
      // Add document verification info
      doc.setFontSize(7);
      doc.text(
        `Verification ID: ${statementId}`,
        105,
        290,
        { align: 'center' }
      );
    }
    
    try {
      // Download the PDF with improved filename
      const fileName = `EvokeEssence_TransactionHistory_${userData.id}_${format(timestamp, 'yyyyMMdd')}.pdf`;
      
      // Enhanced PDF download with multiple fallback methods
      console.log('Starting PDF download process');
      
      // Method 1: Blob URL method
      try {
        console.log('Attempting PDF download using Blob URL method');
        
        // Get PDF data as Blob directly
        const pdfData = doc.output('blob');
        console.log('PDF blob created successfully, size:', pdfData.size);
        
        // Create object URL from blob
        const url = URL.createObjectURL(pdfData);
        console.log('Object URL created successfully');
        
        // Create a hidden download link
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank'; // Open in a new tab if click doesn't trigger download
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        console.log('Triggering download via link click');
        link.click();
        
        // Clean up resources
        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          console.log('Link and blob URL resources cleaned up');
        }, 100);
        
        console.log('Blob URL download method completed successfully');
        return; // Exit if this method worked
      } catch (blobError) {
        console.error('Blob URL method failed:', blobError);
        // Continue to next method
      }
      
      // Method 2: Direct save method (built-in jsPDF method)
      try {
        console.log('Attempting PDF download using direct save method');
        // Use the multi-tier fallback download system for better compatibility
        await downloadPDFWithFallbacks(doc, fileName);
        console.log('Direct save method successful');
        return; // Exit if this method worked
      } catch (directSaveError) {
        console.error('Direct save method failed:', directSaveError);
        // Continue to next method
      }
      
      // Method 3: Data URL method (most compatible)
      try {
        console.log('Attempting PDF download using data URL method');
        const dataUrl = doc.output('dataurlstring');
        console.log('PDF data URL generated, length:', dataUrl.length);
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.target = '_blank'; // Open in new tab if download doesn't trigger
        link.style.display = 'none';
        document.body.appendChild(link);
        
        console.log('Data URL link created and appended');
        link.click();
        
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          console.log('Data URL link cleaned up');
        }, 100);
        
        console.log('Data URL method completed');
        return; // Exit if this method worked
      } catch (dataUrlError) {
        console.error('Data URL method failed:', dataUrlError);
      }
      
      // Method 4: Open PDF in new tab as last resort
      try {
        console.log('Attempting to open PDF in new tab as final fallback');
        const dataUrl = doc.output('dataurlstring');
        window.open(dataUrl, '_blank');
        console.log('PDF opened in new tab');
      } catch (newTabError) {
        console.error('New tab method failed:', newTabError);
        throw new Error('All PDF download methods failed');
      }
    } catch (saveError) {
      console.error('Error with all PDF saving methods:', saveError);
      alert(t('pdf_generation_error') || 'Failed to generate PDF. Please try again later.');
    }
  } catch (error) {
    console.error('Error generating transaction history PDF:', error);
    alert(t('pdf_generation_error') || 'Failed to generate transaction history PDF. Please try again later.');
  }
};