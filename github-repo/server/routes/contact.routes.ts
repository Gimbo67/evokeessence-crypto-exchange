import express, { Request, Response } from 'express';
import { sendContactFormEmail } from '../services/email';
import { z } from 'zod';

export const contactRouter = express.Router();

// Define schema for contact form validation
const contactFormSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});

/**
 * @route POST /api/contact
 * @desc Submit a contact form
 * @access Public
 */
contactRouter.post('/', async (req: Request, res: Response) => {
  console.log('[Contact Form] Received submission:', {
    body: req.body,
    contentType: req.headers['content-type'],
    url: req.url,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl
  });
  
  try {
    // Validate the incoming data
    const validatedData = contactFormSchema.parse(req.body);
    console.log('[Contact Form] Validation passed:', validatedData);
    
    // Process the contact form submission
    await sendContactFormEmail(validatedData);
    console.log('[Contact Form] Email sent successfully');
    
    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.'
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    
    if (error instanceof z.ZodError) {
      // Return validation errors
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'There was an error sending your message. Please try again later.'
    });
  }
});

/**
 * @route POST /api/contact-direct
 * @desc Direct endpoint to submit contact form that bypasses Vite middleware
 * @access Public
 */
export const directContactEndpoint = async (req: Request, res: Response) => {
  console.log('[Contact Form Direct] Received submission:', {
    body: req.body,
    contentType: req.headers['content-type'],
    url: req.url,
    method: req.method
  });
  
  try {
    // Force JSON content type
    res.type('json');
    res.setHeader('Content-Type', 'application/json');
    
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: [
          { field: !name ? 'name' : '', message: 'Name is required' },
          { field: !email ? 'email' : '', message: 'Email is required' },
          { field: !subject ? 'subject' : '', message: 'Subject is required' },
          { field: !message ? 'message' : '', message: 'Message is required' }
        ].filter(error => error.field)
      });
    }
    
    // Send the email using the imported function
    await sendContactFormEmail({ name, email, subject, message });
    console.log('[Contact Form Direct] Email sent successfully');
    
    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.'
    });
  } catch (error) {
    console.error('[Contact Form Direct] Error:', error);
    res.status(500).json({
      success: false,
      message: 'There was an error sending your message. Please try again later.'
    });
  }
};

export function registerContactRoutes(app: express.Express) {
  // Register the standard router
  app.use('/api/contact', contactRouter);
  
  // Register the direct endpoint to bypass Vite
  app.post('/api/contact-direct', express.json(), directContactEndpoint);
  console.log('[Server] Direct contact form endpoint registered via contact.routes.ts');
}