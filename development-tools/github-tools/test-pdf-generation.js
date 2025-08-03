/**
 * Simple test script to verify PDF generation functionality
 */
import { jsPDF } from 'jspdf';
import qrcode from 'qrcode';
import fetch from 'node-fetch';

// Create a simple PDF as a test
async function testPdfGeneration() {
  console.log('Starting PDF generation test...');

  try {
    // Create a new PDF document
    const doc = new jsPDF();
    console.log('PDF document created');

    // Add some text
    doc.text('Test PDF Document', 10, 10);
    console.log('Added text to PDF');

    // Generate a QR code
    try {
      console.log('Generating QR code...');
      const url = await qrcode.toDataURL('https://example.com/verify', {
        margin: 1,
        width: 90,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('QR code generated successfully, length:', url.length);

      // Add QR code to PDF
      doc.addImage(url, 'PNG', 10, 20, 30, 30);
      console.log('QR code added to PDF');
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
    }

    // Try to save PDF
    try {
      const pdfOutput = doc.output();
      console.log('PDF generated successfully, output length:', pdfOutput.length);
      console.log('PDF generation test completed successfully!');
    } catch (saveError) {
      console.error('Error saving PDF:', saveError);
    }
  } catch (error) {
    console.error('Error in PDF generation test:', error);
  }
}

// Run the test
testPdfGeneration();