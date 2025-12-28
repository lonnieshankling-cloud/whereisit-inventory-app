import { secret } from "encore.dev/config";
import { Resend } from "resend";

const resendApiKey = secret("ResendApiKey");

export async function sendInvitationEmail(
  toEmail: string,
  householdName: string,
  invitationCode: string
): Promise<void> {
  try {
    const apiKey = resendApiKey();
    if (!apiKey) {
      console.warn("[Email] Resend API key not configured, skipping email send");
      return;
    }

    const resend = new Resend(apiKey);

    const downloadLink = "https://whereisit.app/download"; // Update with actual download link

    await resend.emails.send({
      from: "WhereIsIt Invitations <onboarding@resend.dev>",
      to: toEmail,
      subject: `You're invited to join ${householdName} on WhereIsIt!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #111827; margin-bottom: 16px;">You're invited to join a household!</h1>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Someone has invited you to join the <strong>${householdName}</strong> household on WhereIsIt, 
              a family-shared inventory management app.
            </p>

            <div style="background: #F3F4F6; border-left: 4px solid #3B82F6; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <p style="color: #6B7280; margin: 0 0 12px 0; font-size: 14px;">Your invitation code:</p>
              <p style="color: #111827; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0; text-align: center; font-family: monospace;">
                ${invitationCode}
              </p>
            </div>

            <h2 style="color: #111827; font-size: 18px; margin: 32px 0 16px 0;">How to join:</h2>
            <ol style="color: #6B7280; font-size: 16px; line-height: 1.8;">
              <li>Download WhereIsIt from your app store</li>
              <li>Sign in or create an account</li>
              <li>Go to <strong>Settings → Household → Join with Code</strong></li>
              <li>Enter the code above: <strong>${invitationCode}</strong></li>
              <li>You'll instantly have access to the shared inventory!</li>
            </ol>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center;">
              <a href="${downloadLink}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-bottom: 16px;">
                Download WhereIsIt
              </a>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                This invitation will expire in 30 days. Need help? Reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("[Email] Invitation sent to:", toEmail);
  } catch (error) {
    console.error("[Email] Failed to send invitation email:", error);
    // Don't throw - email failure shouldn't block invitation creation
  }
}
