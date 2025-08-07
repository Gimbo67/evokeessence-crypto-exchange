import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reference?: string;
  initialAmount?: number;
  commissionAmount?: number;
  totalAmount?: number;
}

interface UserData {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Professional PDF generator with company branding and enhanced design
 */
export const generateSimpleTransactionPDF = async (
  transactions: Transaction[],
  userData: UserData,
  t: (key: string) => string,
  language: string = 'en'
): Promise<void> => {
  try {
    console.log('[PDF Generation] Starting professional PDF generation');
    
    // Create PDF document with professional settings
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set comprehensive metadata
    doc.setProperties({
      title: 'EvokeEssence Transaction History Statement',
      subject: 'Official Transaction History Report',
      author: 'EvokeEssence s.r.o.',
      creator: 'EvokeEssence Cryptocurrency Exchange Platform',
      keywords: 'transaction, history, cryptocurrency, statement, EvokeEssence'
    });

    // Define professional color scheme (RGB values for jsPDF)
    const primaryBlue = [30, 58, 138];    // Deep blue
    const accentBlue = [59, 130, 246];    // Bright blue  
    const lightGray = [248, 250, 252];    // Light background
    const darkGray = [55, 65, 81];        // Dark text
    const mediumGray = [107, 114, 128];   // Medium text

    // Add professional header with company branding
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, 0, 210, 35, 'F');
    
    // Add company logo area (professional design element)
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 17, 8, 'F');
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EE', 25, 21, { align: 'center' });
    
    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('EvokeEssence', 40, 18);
    
    // Tagline
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Cryptocurrency Exchange Platform', 40, 25);
    
    // Document title in header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION HISTORY', 140, 20, { align: 'center' });

    // Add company contact info in header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Děčínská 552/1, Střížkov, 18000 Praha, Czech Republic', 40, 30);

    // Add statement information section
    const currentDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const statementId = `TXH-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Statement info box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(15, 45, 180, 25, 2, 2, 'F');
    
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT INFORMATION', 20, 53);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Statement ID: ${statementId}`, 20, 60);
    doc.text(`Generated: ${currentDate}`, 20, 65);
    doc.text(`Period: All Time`, 120, 60);
    doc.text(`Currency: Multi-Currency`, 120, 65);

    // Account Information Section
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT INFORMATION', 20, 85);
    
    // Account info box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 90, 180, 25, 2, 2, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(15, 90, 180, 25, 2, 2, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    
    // Left column
    doc.text(`Client ID: ${userData.id}`, 20, 98);
    doc.text(`Username: ${userData.username}`, 20, 105);
    if (userData.fullName) {
      doc.text(`Account Holder: ${userData.fullName}`, 20, 112);
    }
    
    // Right column
    if (userData.email) {
      doc.text(`Email: ${userData.email}`, 110, 98);
    }
    if (userData.phoneNumber) {
      doc.text(`Phone: ${userData.phoneNumber}`, 110, 105);
    }
    doc.text(`Report Type: Complete Transaction History`, 110, 112);

    // Transaction History Section Header
    let yPosition = 130;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION HISTORY', 20, yPosition);
    yPosition += 5;
    
    // Add transaction count summary
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(`Total Transactions: ${transactions.length}`, 20, yPosition);
    yPosition += 10;

    // Professional table header
    doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.rect(15, yPosition, 180, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', 20, yPosition + 5);
    doc.text('TYPE', 50, yPosition + 5);
    doc.text('AMOUNT', 80, yPosition + 5);
    doc.text('CURRENCY', 110, yPosition + 5);
    doc.text('STATUS', 140, yPosition + 5);
    doc.text('REFERENCE', 170, yPosition + 5);
    yPosition += 10;

    // Add transactions with alternating row colors
    transactions.forEach((transaction, index) => {
      if (yPosition > 260) { // Check if we need a new page
        doc.addPage();
        
        // Re-add header on new page
        doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
        doc.rect(15, 20, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE', 20, 25);
        doc.text('TYPE', 50, 25);
        doc.text('AMOUNT', 80, 25);
        doc.text('CURRENCY', 110, 25);
        doc.text('STATUS', 140, 25);
        doc.text('REFERENCE', 170, 25);
        
        yPosition = 30;
      }

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Very light gray
        doc.rect(15, yPosition - 2, 180, 6, 'F');
      }

      const transactionDate = format(new Date(transaction.createdAt), 'dd/MM/yyyy');
      
      // Status color coding (RGB values)
      let statusColor = mediumGray;
      if (transaction.status === 'completed' || transaction.status === 'successful') {
        statusColor = [16, 185, 129]; // Green
      } else if (transaction.status === 'pending' || transaction.status === 'processing') {
        statusColor = [245, 158, 11]; // Orange
      } else if (transaction.status === 'failed') {
        statusColor = [239, 68, 68]; // Red
      }

      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      doc.text(transactionDate, 20, yPosition);
      doc.text(transaction.type, 50, yPosition);
      doc.text(`${transaction.amount.toFixed(2)}`, 80, yPosition);
      doc.text(transaction.currency, 110, yPosition);
      
      // Status with color
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(transaction.status.toUpperCase(), 140, yPosition);
      
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(transaction.reference || '-', 170, yPosition);
      
      yPosition += 6;
    });

    // Add professional footer to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer background
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(0, 275, 210, 22, 'F');
      
      // Company information in footer
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Left side - Company details
      doc.text('EvokeEssence s.r.o.', 20, 282);
      doc.text('Registration No.: 22490035', 20, 287);
      doc.text('VAT ID: CZ22490035', 20, 292);
      
      // Center - Contact information
      doc.text('Děčínská 552/1, Střížkov', 70, 282);
      doc.text('18000 Praha, Czech Republic', 70, 287);
      doc.text('Email: info@evokeessence.com', 70, 292);
      
      // Right side - Document info
      doc.text(`Page ${i} of ${pageCount}`, 170, 282);
      doc.text('Generated electronically', 170, 287);
      doc.text('Official Transaction Report', 170, 292);
      
      // Add separator line above footer
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 274, 190, 274);
    }
    
    // Add security notice/disclaimer
    if (pageCount > 0) {
      doc.setPage(pageCount);
      yPosition = Math.max(yPosition + 15, 245);
      
      // Security notice box
      doc.setFillColor(255, 248, 220); // Light yellow background
      doc.roundedRect(15, yPosition, 180, 20, 2, 2, 'F');
      doc.setDrawColor(255, 193, 7); // Yellow border
      doc.roundedRect(15, yPosition, 180, 20, 2, 2, 'S');
      
      doc.setTextColor(133, 77, 14); // Dark yellow text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPORTANT NOTICE', 20, yPosition + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.text('This document is an official transaction history statement generated by EvokeEssence', 20, yPosition + 11);
      doc.text('Exchange. All transactions are recorded with blockchain verification where applicable.', 20, yPosition + 16);
    }

    // Download the PDF using simple method
    const filename = `EvokeEssence_Transactions_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    try {
      // Try the most basic download method first
      doc.save(filename);
      console.log('[PDF Generation] PDF downloaded successfully');
    } catch (saveError) {
      console.error('[PDF Generation] Simple save failed, trying blob method:', saveError);
      
      // Fallback to blob method
      const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    }

  } catch (error) {
    console.error('[PDF Generation] Error in simplified PDF generation:', error);
    throw error;
  }
};