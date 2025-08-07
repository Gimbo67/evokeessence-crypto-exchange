const verificationEmailContent = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td>
      <h2 style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; line-height: 28px; font-weight: bold; color: #1e293b;">
        Verify Your Email
      </h2>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #334155;">
        Dear {{fullName}},
      </p>
      <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #334155;">
        Please use the verification code below to complete your {{purpose}}:
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
        <tr>
          <td align="center" style="padding: 24px; background-color: #f8fafc; border-radius: 8px;">
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.5em; color: #1e293b;">
              {{code}}
            </span>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #64748b;">
        This code will expire in 15 minutes. If you didn't request this verification, please ignore this email or contact support.
      </p>
      <p style="margin: 0; font-size: 16px; line-height: 24px; color: #334155;">
        Best regards,<br>
        The EvokeEssence Team
      </p>
    </td>
  </tr>
</table>
`;

export interface VerificationEmailData {
  fullName: string;
  code: string;
  purpose: string;
}

export default verificationEmailContent;