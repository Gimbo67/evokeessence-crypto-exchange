import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { downloadPDFWithFallbacks } from '@/utils/pdf-download-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import qrcode from 'qrcode';

interface TestFormValues {
  includeQrCode: boolean;
  includeTable: boolean;
  includeHeaders: boolean;
  includeImages: boolean;
  tableRows: number;
  tableColumns: number;
  documentSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

export default function PDFTestPage() {
  const [status, setStatus] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const form = useForm<TestFormValues>({
    defaultValues: {
      includeQrCode: true,
      includeTable: true,
      includeHeaders: true,
      includeImages: false,
      tableRows: 10,
      tableColumns: 5,
      documentSize: 'a4',
      orientation: 'portrait',
    },
  });

  const generateBasicPDF = async () => {
    try {
      setStatus({ success: true, message: 'Generating basic PDF...' });
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Add some text
      doc.setFontSize(16);
      doc.text('PDF Test Document', 105, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('This is a basic PDF test to check if PDF generation works.', 105, 25, { align: 'center' });
      
      // Add footer with date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });
      
      // Download the PDF
      await downloadPDFWithFallbacks(doc, 'basic-test.pdf');
      
      setStatus({ 
        success: true, 
        message: 'Basic PDF generated successfully', 
        details: 'The PDF should have downloaded automatically.'
      });
    } catch (error) {
      console.error('Error generating basic PDF:', error);
      setStatus({ 
        success: false, 
        message: 'Failed to generate basic PDF', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const generateCustomPDF = async (data: TestFormValues) => {
    try {
      setStatus({ success: true, message: 'Generating custom PDF...' });
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: data.orientation,
        unit: 'mm',
        format: data.documentSize,
      });
      
      // Add some text
      doc.setFontSize(16);
      doc.text('Custom PDF Test Document', 15, 15);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 25);
      doc.text(`Configuration: ${JSON.stringify(data, null, 2)}`, 15, 30);
      
      let yPosition = 40;
      
      // Add QR code if selected
      if (data.includeQrCode) {
        try {
          // Generate QR code
          const url = await qrcode.toDataURL('https://evokeessence.com/verify/test-document', {
            margin: 1,
            width: 100,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          // Add QR code to PDF
          doc.addImage(url, 'PNG', 15, yPosition, 30, 30);
          doc.text('QR Code Test', 50, yPosition + 15);
          yPosition += 40;
        } catch (qrError) {
          console.error('Error generating QR code:', qrError);
          doc.text('Failed to generate QR code', 15, yPosition);
          yPosition += 10;
        }
      }
      
      // Add table if selected
      if (data.includeTable) {
        // Create table header
        const tableHead = data.includeHeaders 
          ? [Array.from({ length: data.tableColumns }, (_, i) => `Header ${i + 1}`)]
          : [];
        
        // Create table body
        const tableBody = Array.from({ length: data.tableRows }, (_, rowIndex) => {
          return Array.from({ length: data.tableColumns }, (_, colIndex) => {
            return `Cell ${rowIndex + 1}-${colIndex + 1}`;
          });
        });
        
        // Add the table
        (doc as any).autoTable({
          head: tableHead,
          body: tableBody,
          startY: yPosition,
          theme: 'grid',
          styles: {
            fontSize: 8,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          },
        });
        
        // Update y position after table
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Add page information
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 15, doc.internal.pageSize.getHeight() - 10);
      }
      
      // Download the PDF
      await downloadPDFWithFallbacks(doc, 'custom-test.pdf');
      
      setStatus({ 
        success: true, 
        message: 'Custom PDF generated successfully', 
        details: 'The PDF should have downloaded automatically.'
      });
    } catch (error) {
      console.error('Error generating custom PDF:', error);
      setStatus({ 
        success: false, 
        message: 'Failed to generate custom PDF', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">PDF Generation Test Page</h1>
      
      <p className="mb-4 text-sm text-muted-foreground">
        This page tests PDF generation functionality with various configurations.
      </p>
      
      {status && (
        <Alert 
          variant={status.success ? "default" : "destructive"} 
          className="mb-6"
        >
          {status.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{status.message}</AlertTitle>
          {status.details && (
            <AlertDescription>{status.details}</AlertDescription>
          )}
        </Alert>
      )}
      
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Test</TabsTrigger>
          <TabsTrigger value="custom">Custom Test</TabsTrigger>
        </TabsList>
      
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic PDF Generation Test</CardTitle>
              <CardDescription>
                Generate a simple PDF with basic content to test core functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                This will create a basic PDF with text content to verify that PDF generation is working correctly.
              </p>
              <div className="flex items-center space-x-2 rounded-md border p-4">
                <Info className="h-5 w-5 text-blue-500" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    What this test includes:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Basic text, page formatting, and download functionality.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={generateBasicPDF}>Generate Basic PDF</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Custom PDF Generation Test</CardTitle>
              <CardDescription>
                Configure and generate a PDF with custom options to test specific features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(generateCustomPDF)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="documentSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Document Size</FormLabel>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="a4">A4</option>
                              <option value="letter">Letter</option>
                            </select>
                          </FormItem>
                        )}
                      />
                    
                      <FormField
                        control={form.control}
                        name="orientation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Orientation</FormLabel>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="portrait">Portrait</option>
                              <option value="landscape">Landscape</option>
                            </select>
                          </FormItem>
                        )}
                      />
                    
                      <FormField
                        control={form.control}
                        name="tableRows"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Table Rows</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="50" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    
                      <FormField
                        control={form.control}
                        name="tableColumns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Table Columns</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" max="10" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="includeTable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Include Table</FormLabel>
                              <FormDescription>
                                Add a data table to test table rendering
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="includeHeaders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!form.watch('includeTable')}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Include Table Headers</FormLabel>
                              <FormDescription>
                                Add headers to the table
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="includeQrCode"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Include QR Code</FormLabel>
                              <FormDescription>
                                Add a QR code to test image rendering
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="mt-4">Generate Custom PDF</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}