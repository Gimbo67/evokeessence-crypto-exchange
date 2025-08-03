const welcomeEmailContent = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td>
      <h2 style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; line-height: 28px; font-weight: bold; color: #1e293b;">
        Welcome to EvokeEssence Exchange!
      </h2>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
        Dear {{fullName}},
      </p>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
        Thank you for choosing EvokeEssence Exchange. We're excited to have you join our platform for secure and efficient cryptocurrency trading.
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
        <tr>
          <td style="padding: 16px; background-color: #f8fafc; border-radius: 8px;">
            <h3 style="margin: 0 0 12px; font-size: 18px; line-height: 24px; color: #1e293b;">Getting Started</h3>
            <ul style="margin: 0; padding-left: 24px; color: #334155;">
              <li style="margin-bottom: 8px;">Complete your profile verification</li>
              <li style="margin-bottom: 8px;">Set up two-factor authentication</li>
              <li style="margin-bottom: 8px;">Make your first deposit</li>
            </ul>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
        To ensure the security of your account, please verify your email address by clicking the button below:
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <a href="{{verificationLink}}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; line-height: 24px;">
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; font-size: 16px; line-height: 24px; color: #334155;">
        If you have any questions or need assistance, our support team is here to help.
      </p>
      <p style="margin: 24px 0 0; font-size: 16px; line-height: 24px; color: #334155;">
        Best regards,<br>
        The EvokeEssence Team
      </p>
    </td>
  </tr>
</table>
`;

export interface WelcomeEmailData {
  fullName: string;
  verificationLink: string;
}

export default welcomeEmailContent;