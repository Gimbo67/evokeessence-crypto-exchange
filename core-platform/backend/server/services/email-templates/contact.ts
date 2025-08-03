import { renderTemplate } from './base';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function contactEmailContent(data: ContactFormData): { subject: string; html: string } {
  const subject = `Contact Form: ${data.subject}`;
  
  const content = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333;">
      <h2 style="color: #2563eb; font-size: 20px; margin-bottom: 16px;">New Contact Form Submission</h2>
      
      <p style="margin-bottom: 24px;">
        You've received a new message from the contact form on your website.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 100px;">Name:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Subject:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${data.subject}</td>
        </tr>
      </table>

      <div style="padding: 16px; background-color: #f9fafb; border-radius: 6px; margin-bottom: 24px;">
        <h3 style="font-size: 16px; margin-top: 0; margin-bottom: 12px; color: #1f2937;">Message:</h3>
        <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        This email was sent from the contact form on EvokeEssence Exchange.
      </p>
    </div>
  `;

  const html = renderTemplate({
    subject: subject,
    content: content
  });

  return {
    subject,
    html
  };
}