/**
 * Simple PDF generation test script
 * This script directly tests jsPDF without the React component
 */

const jsPDF = require('jspdf');
require('jspdf-autotable');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function generateSimplePDF() {
  console.log('Starting simple PDF generation test...');
  
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add some text
    doc.setFontSize(22);
    doc.text('PDF Generation Test', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('This is a test document to verify PDF generation works properly.', 105, 30, { align: 'center' });
    
    // Add a table
    const tableData = [
      ['ID', 'Name', 'Amount', 'Status'],
      ['1', 'Transaction 1', '$100.00', 'Completed'],
      ['2', 'Transaction 2', '$250.50', 'Pending'],
      ['3', 'Transaction 3', '$75.25', 'Completed']
    ];
    
    doc.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: 40,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    
    // Generate a QR code
    console.log('Generating QR code...');
    const qrCodeDataUrl = await qrcode.toDataURL('https://example.com/verify/123456789');
    
    // Add QR code to PDF
    doc.addImage(qrCodeDataUrl, 'PNG', 80, 100, 40, 40);
    doc.setFontSize(10);
    doc.text('Scan to verify authenticity', 100, 150, { align: 'center' });
    
    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }
    
    // Save the PDF
    const pdfPath = path.join(__dirname, 'test-document.pdf');
    console.log(`Saving PDF to ${pdfPath}`);
    fs.writeFileSync(pdfPath, doc.output(), 'binary');
    
    console.log('PDF generated successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

// Run the test
generateSimplePDF();