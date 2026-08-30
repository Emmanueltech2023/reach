// ─── Brevo Transactional Email Integration ────────────────────────────────────
// Uses Brevo API v3 (https://api.brevo.com/v3/smtp/email)

const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.RESEND_API_KEY;
let cachedSenderEmail: string | null = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || null;
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "REACH Platform";
const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const APP_URL = (rawAppUrl && !rawAppUrl.includes("your-vercel-url")) ? rawAppUrl : "http://localhost:3000";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
};

/**
 * Auto-discovers the account's first verified sender email from Brevo API if not explicitly set.
 */
async function getVerifiedSenderEmail(apiKey: string): Promise<string> {
  if (cachedSenderEmail) return cachedSenderEmail;

  try {
    const res = await fetch("https://api.brevo.com/v3/senders", {
      headers: {
        "api-key": apiKey,
        "Accept": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const senders = data.senders || [];
      const activeSender = senders.find((s: any) => s.active) || senders[0];
      if (activeSender && typeof activeSender.email === "string") {
        cachedSenderEmail = activeSender.email;
        console.log("[Brevo Email] Auto-detected verified sender:", activeSender.email);
        return activeSender.email;
      }
    }
  } catch (err) {
    console.warn("[Brevo Email] Sender discovery notice:", err);
  }

  // Fallback
  return "noreply@reach-platform.com";
}

/**
 * Sends a transactional email using the Brevo API v3.
 */
export async function sendEmail({ to, subject, html, senderName, senderEmail }: EmailPayload) {
  const apiKey = BREVO_API_KEY;

  if (!apiKey) {
    console.log("[Brevo Email] No API key set (BREVO_API_KEY) — skipping dispatch:", subject, "to", to);
    return { success: false, error: "Missing BREVO_API_KEY" };
  }

  const effectiveSenderEmail = senderEmail || await getVerifiedSenderEmail(apiKey);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName || SENDER_NAME,
          email: effectiveSenderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error("[Brevo Email] Send failed:", resJson);
      return { success: false, error: resJson.message || "Failed to send Brevo email" };
    }

    console.log("[Brevo Email] Sent successfully to:", to, "MessageId:", resJson.messageId || resJson);
    return { success: true, data: resJson };
  } catch (err) {
    console.error("[Brevo Email] Exception during dispatch:", err);
    return { success: false, error: String(err) };
  }
}

// ─── Rich HTML Email Templates ────────────────────────────────────────────────
export const emailTemplates = {
  welcome: (name: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <p style="color: #C9A84C; font-size: 11px; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.5px;">Resources · Entrepreneurs · Access · Capital · Horizons</p>
        <h2 style="font-size: 18px; font-weight: 500; margin: 0 0 12px;">Welcome, ${name}!</h2>
        <p style="color: #A8A6B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Your account has been created. Complete your identity verification to unlock full platform access and start connecting with verified entrepreneurs and capital allocators globally.
        </p>
        <a href="${APP_URL}/auth/kyc" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Complete KYC verification
        </a>
        <p style="color: #5C5A70; font-size: 12px; margin: 24px 0 0;">
          If you didn't create this account, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `,

  kycApproved: (name: string, role: string = "investor") => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <div style="background: #0A2910; border: 1px solid #1A5C2A; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #4ADE80; font-size: 16px; font-weight: 500; margin: 0 0 8px;">✓ Identity Verified</p>
          <p style="color: #A8A6B8; font-size: 14px; margin: 0;">
            Congratulations ${name}! Your identity has been verified. You now have full access to REACH.
          </p>
        </div>
        <a href="${APP_URL}/dashboard/${role}" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Go to dashboard
        </a>
      </div>
    </body>
    </html>
  `,

  kycRejected: (name: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <div style="background: #2A0A0A; border: 1px solid #5C1A1A; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #F87171; font-size: 16px; font-weight: 500; margin: 0 0 8px;">KYC Submission Rejected</p>
          <p style="color: #A8A6B8; font-size: 14px; margin: 0;">
            Hi ${name}, your KYC submission was not approved. Please resubmit with clearer, valid documents.
          </p>
        </div>
        <a href="${APP_URL}/auth/kyc" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Resubmit documents
        </a>
      </div>
    </body>
    </html>
  `,

  meetingInvite: (name: string, meetingTitle: string, date: string, organizer: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <p style="font-size: 16px; font-weight: 500; margin: 20px 0 8px;">📅 Meeting invitation</p>
        <p style="color: #A8A6B8; font-size: 14px; margin: 0 0 20px;">Hi ${name}, ${organizer} has scheduled a meeting with you.</p>
        <div style="background: #0F0F1A; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
          <p style="color: #C9A84C; font-weight: 500; margin: 0 0 4px;">${meetingTitle}</p>
          <p style="color: #5C5A70; font-size: 13px; margin: 0;">${date}</p>
        </div>
        <a href="${APP_URL}/dashboard/meetings" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          View meeting
        </a>
      </div>
    </body>
    </html>
  `,

  dealUpdate: (name: string, projectName: string, stage: string, amount?: number) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <p style="font-size: 16px; font-weight: 500; margin: 20px 0 8px;">Deal update — ${projectName}</p>
        <div style="background: #C9A84C20; border: 1px solid #C9A84C30; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
          <p style="color: #C9A84C; font-weight: 500; margin: 0 0 4px;">Stage: ${stage}</p>
          ${amount ? `<p style="color: #A8A6B8; font-size: 13px; margin: 0;">Deal size: $${amount.toLocaleString()}</p>` : ""}
        </div>
        <a href="${APP_URL}/dashboard/deals" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          View deal pipeline
        </a>
      </div>
    </body>
    </html>
  `,

  newMessage: (name: string, senderName: string, preview: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <p style="font-size: 16px; font-weight: 500; margin: 20px 0 8px;">💬 New message from ${senderName}</p>
        <div style="background: #0F0F1A; border-radius: 12px; padding: 16px; margin: 0 0 24px; border-left: 3px solid #C9A84C;">
          <p style="color: #A8A6B8; font-size: 14px; margin: 0; font-style: italic;">"${preview}"</p>
        </div>
        <a href="${APP_URL}/dashboard/chats" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Reply now
        </a>
        <p style="color: #5C5A70; font-size: 12px; margin: 20px 0 0;">
          You're receiving this because you have email notifications enabled on REACH.
        </p>
      </div>
    </body>
    </html>
  `,

  commissionInvoice: (name: string, projectName: string, dealAmount: number, commissionAmount: number, dueDate: string) => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <p style="font-size: 16px; font-weight: 500; margin: 20px 0 8px;">🎉 Deal closed — Commission invoice</p>
        <p style="color: #A8A6B8; font-size: 14px; margin: 0 0 20px;">
          Congratulations ${name}! Your deal for <strong>${projectName}</strong> has been successfully closed.
        </p>
        <div style="background: #0F0F1A; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #5C5A70; font-size: 13px;">Deal size</span>
            <span style="color: #F5F3ED; font-size: 13px; font-weight: 500;">$${dealAmount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #5C5A70; font-size: 13px;">Commission rate</span>
            <span style="color: #F5F3ED; font-size: 13px; font-weight: 500;">3%</span>
          </div>
          <div style="border-top: 1px solid #3A3A52; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between;">
            <span style="color: #C9A84C; font-size: 14px; font-weight: 500;">Commission due</span>
            <span style="color: #C9A84C; font-size: 14px; font-weight: 500;">$${commissionAmount.toFixed(2)}</span>
          </div>
          <p style="color: #5C5A70; font-size: 12px; margin: 8px 0 0;">Due by ${dueDate}</p>
        </div>
        <a href="${APP_URL}/dashboard/deals" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          View deal
        </a>
      </div>
    </body>
    </html>
  `,

  upgradeApproved: (name: string, plan: string, role: string = "investor") => `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #0F0F1A; color: #F5F3ED; padding: 40px 20px; margin: 0;">
      <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 32px; border: 1px solid #3A3A52;">
        <h1 style="font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0 0 4px;">R<span style="color: #C9A84C;">EACH</span></h1>
        <div style="background: #C9A84C10; border: 1px solid #C9A84C30; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #C9A84C; font-size: 16px; font-weight: 500; margin: 0 0 8px;">⭐ ${plan} plan activated</p>
          <p style="color: #A8A6B8; font-size: 14px; margin: 0;">
            Welcome to ${plan}, ${name}! Your payment has been verified and your subscription is now active.
          </p>
        </div>
        <a href="${APP_URL}/dashboard/${role}" 
           style="display: inline-block; background: #C9A84C; color: #1A1A2E; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
          Explore your new features
        </a>
      </div>
    </body>
    </html>
  `,
};