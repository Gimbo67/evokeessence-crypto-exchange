/**
 * PDF Download Utilities
 * 
 * This file contains utility functions for downloading PDF files
 * with multiple fallback mechanisms to ensure compatibility across
 * different browsers and environments.
 */

import jsPDF from 'jspdf';

/**
 * Multi-tier fallback system for downloading PDFs
 * 
 * This function tries multiple methods to download a PDF:
 * 1. Blob URL Download (most reliable in modern browsers)
 * 2. Direct Save (using jsPDF built-in save)
 * 3. Data URL Download (compatible with more restrictive environments)
 * 4. New Tab Opening (maximum compatibility fallback)
 * 
 * @param doc - The jsPDF document to download
 * @param filename - The name to use for the downloaded file
 */
export const downloadPDFWithFallbacks = async (doc: jsPDF, filename: string): Promise<void> => {
  console.log('[PDF Download] Starting PDF download with fallback mechanisms');
  
  // First, try the preferred method: Blob URL with download attribute
  try {
    console.log('[PDF Download] Attempting download via Blob URL (Method 1)');
    
    // Create a blob from the PDF
    const pdfBlob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
    
    // Create a URL for the blob
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    
    // Add to document, click and remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up after a delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      console.log('[PDF Download] Method 1 completed');
    }, 100);
    
    return; // If we get here, download succeeded
  } catch (error) {
    console.error('[PDF Download] Method 1 failed:', error);
    
    // Fall through to next method
  }
  
  // Fallback method 2: Use jsPDF's built-in save method
  try {
    console.log('[PDF Download] Attempting download via jsPDF save method (Method 2)');
    doc.save(filename);
    console.log('[PDF Download] Method 2 completed');
    return;
  } catch (error) {
    console.error('[PDF Download] Method 2 failed:', error);
    
    // Fall through to next method
  }
  
  // Fallback method 3: Data URL in current tab
  try {
    console.log('[PDF Download] Attempting download via Data URL (Method 3)');
    
    // Generate data URL
    const pdfDataUrl = doc.output('dataurlstring');
    
    // Create a link to trigger download
    const link = document.createElement('a');
    link.href = pdfDataUrl;
    link.download = filename;
    link.target = '_self'; // Open in same tab
    link.style.display = 'none';
    
    // Add to document, click and remove
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      console.log('[PDF Download] Method 3 completed');
    }, 100);
    
    return;
  } catch (error) {
    console.error('[PDF Download] Method 3 failed:', error);
    
    // Fall through to final method
  }
  
  // Fallback method 4: Open in new tab as last resort
  try {
    console.log('[PDF Download] Attempting to open PDF in new tab (Method 4)');
    
    // Generate data URL
    const pdfDataUrl = doc.output('dataurlstring');
    
    // Open the PDF in a new tab
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>${filename}</title>
          </head>
          <body style="margin: 0; padding: 0;">
            <embed width="100%" height="100%" src="${pdfDataUrl}" type="application/pdf" />
            <div style="position: fixed; top: 10px; left: 10px; background: rgba(255,255,255,0.8); padding: 10px; border-radius: 5px;">
              <p>Right-click and select 'Save As' to download the document</p>
            </div>
          </body>
        </html>
      `);
      console.log('[PDF Download] Method 4 completed - PDF opened in new tab');
    } else {
      throw new Error('Could not open new tab');
    }
  } catch (error) {
    console.error('[PDF Download] All download methods failed:', error);
    
    // Show error to user if all methods fail
    alert('Could not download PDF. Please check your browser settings or try again later.');
  }
};

/**
 * Checks if the download capability is available in this environment
 * Useful for pre-checking before attempting downloads
 */
export const canDownloadPDF = (): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  
  // Check for basic blob support
  if (typeof Blob === 'undefined') {
    return false;
  }
  
  // Check for URL.createObjectURL support (modern browsers)
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    // We can still try other methods, so return true
    return true;
  }
  
  return true;
};