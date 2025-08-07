import nodemailer from 'nodemailer';
import { eq, and, gt } from "drizzle-orm";
import { db } from "@db";
import { users, verificationCodes } from "@db/schema";
import cryptoRandomString from 'crypto-random-string';
import { renderTemplate } from './email-templates/base';
import welcomeEmailContent from './email-templates/welcome';
import verificationEmailContent from './email-templates/verification';
import contactEmailContent, { ContactFormData } from './email-templates/contact';
import handlebars from 'handlebars';

// Create reusable transporter object using SMTP transport
let transporter: nodemailer.Transporter | null = null;

async function testEmailConnection() {
  if (!transporter) {
    console.error('Cannot test email connection: transporter is not initialized');
    return false;
  }

  try {
    const result = await transporter.verify();
    console.log('Email connection test result:', result);
    return result;
  } catch (error) {
    console.error('Email connection test failed:', error);
    if (error instanceof Error) {
      console.error('Connection error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    return false;
  }
}

function initializeTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email service not configured: Missing required environment variables");
    console.error("Available variables:", {
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE
    });
    return false;
  }

  try {
    const config = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false, // Force this to false and use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      requireTLS: true,
      debug: true,
      logger: true
    };

    console.log('Initializing email transporter with config:', {
      ...config,
      auth: { user: config.auth.user, pass: '****' }
    });

    transporter = nodemailer.createTransport(config);
    return true;
  } catch (error) {
    console.error('Error initializing email transporter:', error);
    return false;
  }
}

export async function sendTestEmail(email: string): Promise<boolean> {
  console.log('Starting test email process for:', email);

  if (!transporter) {
    const initialized = initializeTransporter();
    if (!initialized) {
      throw new Error("Failed to initialize email service");
    }

    const connectionTest = await testEmailConnection();
    if (!connectionTest) {
      throw new Error("Failed to establish email connection");
    }
  }

  try {
    const mailOptions = {
      from: `"EvokeEssence Exchange" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Test Email from EvokeEssence Exchange',
      text: 'This is a test email from EvokeEssence Exchange.',
      html: '<p>This is a test email from EvokeEssence Exchange.</p>'
    };

    console.log('Sending test email with options:', {
      ...mailOptions,
      from: process.env.EMAIL_USER
    });

    const result = await transporter!.sendMail(mailOptions);
    console.log('Test email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

export async function sendWelcomeEmail(email: string, fullName: string, userId: number) {
  console.log('Starting welcome email process for:', { email, fullName, userId });

  if (!transporter) {
    const initialized = initializeTransporter();
    if (!initialized) {
      throw new Error("Failed to initialize email service");
    }

    const connectionTest = await testEmailConnection();
    if (!connectionTest) {
      throw new Error("Failed to establish email connection");
    }
  }

  try {
    console.log('Generating email verification token');
    const { generateEmailVerificationToken } = await import('../utils/token.utils');
    const verificationToken = generateEmailVerificationToken(userId, email);
    
    // Create verification link using request origin or environment variables
    // Get the domain from various possible sources
    let domain = process.env.APP_URL; // First priority: explicit APP_URL env var
    
    if (!domain) {
      // Second priority: check for deployment domain
      domain = process.env.REPL_SLUG ? 
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
        'https://evo-exchange.com'; // Default to production domain if all else fails
    }
    
    const verificationLink = `${domain}/verify-email?token=${encodeURIComponent(verificationToken)}&userId=${userId}`;
    
    console.log('Verification link generated for domain:', domain);
    console.log('Verification link generated:', { verificationLink: verificationLink.substring(0, 50) + '...' });

    console.log('Compiling welcome email template');
    const welcomeTemplate = handlebars.compile(welcomeEmailContent);

    const content = welcomeTemplate({
      fullName: fullName || 'Valued Customer',
      verificationLink
    });

    console.log('Rendering email template with base template');
    const html = renderTemplate({
      subject: 'Welcome to EvokeEssence Exchange',
      content
    });

    const mailOptions = {
      from: `"EvokeEssence Exchange" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EvokeEssence Exchange',
      html
    };

    console.log('Attempting to send welcome email to:', email);

    const result = await transporter!.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });
    return result;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}

export async function createAndSendVerificationCode(userId: number, email: string, type: 'email_verification' | 'password_reset') {
  if (!transporter && !initializeTransporter()) {
    throw new Error("Email service not configured");
  }

  console.log(`Creating verification code for user ${userId} of type ${type}`);
  const code = cryptoRandomString({length: 6, type: 'numeric'});
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  try {
    await db.insert(verificationCodes).values({
      userId,
      code,
      type,
      expiresAt,
    });

    const verificationTemplate = handlebars.compile(verificationEmailContent);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const fullName = user?.fullName || 'Valued Customer';

    const content = verificationTemplate({
      fullName,
      code,
      purpose: type === 'email_verification' ? 'email verification' : 'password reset'
    });

    const html = renderTemplate({
      subject: type === 'email_verification' ? 'Verify your email address' : 'Reset your password',
      content
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: type === 'email_verification' ? 'Verify your email address' : 'Reset your password',
      html
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result);
    return code;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function verifyCode(userId: number, code: string, type: 'email_verification' | 'password_reset') {
  const now = new Date();

  const verificationCode = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.code, code),
      eq(verificationCodes.type, type),
      eq(verificationCodes.used, false),
      gt(verificationCodes.expiresAt, now)
    ),
  });

  if (!verificationCode) {
    return false;
  }

  await db
    .update(verificationCodes)
    .set({ used: true })
    .where(eq(verificationCodes.id, verificationCode.id));

  if (type === 'email_verification') {
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  return true;
}

/**
 * Sends a contact form submission to the specified email address
 * @param contactData - Data from the contact form submission
 * @returns Promise<boolean> - Success indicator
 */
export async function sendContactFormEmail(contactData: ContactFormData): Promise<boolean> {
  console.log('Processing contact form submission:', contactData);

  if (!transporter) {
    const initialized = initializeTransporter();
    if (!initialized) {
      console.error("Failed to initialize email service for contact form");
      throw new Error("Email service not available");
    }

    const connectionTest = await testEmailConnection();
    if (!connectionTest) {
      console.error("Failed to establish email connection for contact form");
      throw new Error("Email service connection failed");
    }
  }

  try {
    const { subject, html } = contactEmailContent(contactData);
    
    const mailOptions = {
      from: `"EvokeEssence Exchange" <${process.env.EMAIL_USER}>`,
      to: "noreply@evo-exchange.com", // Contact form submissions go to this address
      replyTo: contactData.email, // Set reply-to as the submitter's email
      subject,
      html
    };

    console.log('Sending contact form email with options:', {
      ...mailOptions,
      from: process.env.EMAIL_USER,
      html: '(HTML content omitted)'
    });

    const result = await transporter!.sendMail(mailOptions);
    
    console.log('Contact form email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });
    
    return true;
  } catch (error) {
    console.error('Error sending contact form email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    throw error;
  }
}