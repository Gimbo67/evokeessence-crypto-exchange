import handlebars from 'handlebars';

const baseEmailTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{{subject}}</title>
  </head>
  <body style="margin: 0; padding: 0; width: 100%; word-break: break-word; -webkit-font-smoothing: antialiased; background-color: #f8fafc;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f8fafc; margin: 0; padding: 0;">
      <tr>
        <td align="center" style="padding: 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
            <tr>
              <td bgcolor="#1a365d" align="center" style="padding: 24px; background: linear-gradient(to right, #1a365d, #2563eb); border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 24px; line-height: 32px; font-weight: bold; color: #ffffff;">
                  EvokeEssence Exchange
                </h1>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="padding: 24px; border-radius: 0 0 8px 8px;">
                {{{content}}}
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px;">
                  <tr>
                    <td align="center" style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b;">
                        © ${new Date().getFullYear()} EvokeEssence s.r.o. All rights reserved.
                      </p>
                      <p style="margin: 8px 0 0; font-size: 12px; line-height: 16px; color: #94a3b8;">
                        This is an automated message, please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export interface EmailTemplateData {
  subject: string;
  content: string;
}

export function renderTemplate(data: EmailTemplateData): string {
  const template = handlebars.compile(baseEmailTemplate);
  return template(data);
}