import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";
const {
  RESEND_API_KEY,
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  MAIL_FROM, MAIL_REPLY_TO,
} = process.env;

const provider = RESEND_API_KEY
  ? "resend"
  : SMTP_HOST && SMTP_USER && SMTP_PASS
    ? "smtp"
    : "dev";

let transporter = null;
if (provider === "smtp") {
  const port = Number(SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  transporter.verify().then(
    () => console.log("✔ Email ready (SMTP)"),
    (error) => console.error("✖ Email (SMTP) error:", error.message),
  );
} else if (provider === "resend") {
  console.log("✔ Email ready (Resend API)");
} else {
  console.warn("! No email provider set — OTP codes will be printed in this terminal (dev only).");
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function template({ name, code, purpose }) {
  const isVerify = purpose === "verify" || purpose === "register" || purpose === "verification";
  const title = isVerify ? "Verify your email" : "Your login code";
  const intro = isVerify
    ? "Welcome to VMEX! Use this code to verify your email address:"
    : "Use this code to finish logging in to your VMEX client portal:";

  return `<!doctype html>
<html><body style="margin:0;background:#050b1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050b1a;padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#0b1428;border:1px solid #1e3a6e;border-radius:16px;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">VM<span style="color:#5ab4ff;">EX</span></div>
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <h1 style="margin:0 0 10px;font-size:20px;color:#ffffff;">${title}</h1>
          <p style="margin:0;color:#a9bde0;font-size:14px;line-height:1.6;">Hi ${escapeHtml(name || "there")},<br>${intro}</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 28px;">
          <div style="display:inline-block;padding:16px 26px;border-radius:12px;background:#050b1a;border:1px solid #2f7bff;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#ffffff;">
            ${escapeHtml(code)}
          </div>
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="margin:0;color:#7f93b8;font-size:12px;line-height:1.6;">This code expires in 10 minutes. If you didn't request it, you can ignore this email. Never share this code with anyone, including VMEX staff.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendWithResend({ to, subject, html, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM || "VMEX <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
      ...(MAIL_REPLY_TO ? { reply_to: MAIL_REPLY_TO } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${data.message || data.name || "request failed"}`);
  return data.id;
}

async function sendWithSmtp({ to, subject, html, text }) {
  await transporter.sendMail({
    from: MAIL_FROM || `VMEX <${SMTP_USER}>`,
    to,
    subject,
    html,
    text,
    replyTo: MAIL_REPLY_TO || undefined,
  });
}

export async function sendOtpEmail(to, name, code, purpose = "login") {
  const isVerify = purpose === "verify" || purpose === "register" || purpose === "verification";
  const subject = isVerify
    ? `${code} is your VMEX verification code`
    : `${code} is your VMEX login code`;
  const text = `Hi ${name || "there"},\n\nYour VMEX code is: ${code}\n\nIt expires in 10 minutes. Never share this code with anyone.\n\n— VMEX`;
  const html = template({ name, code, purpose });

  if (provider === "resend") return sendWithResend({ to, subject, html, text });
  if (provider === "smtp") return sendWithSmtp({ to, subject, html, text });
  if (isProd) throw new Error("Email is not configured on the server.");
  console.log(`\n[DEV OTP] ${purpose} code for ${to}: ${code}\n`);
}
