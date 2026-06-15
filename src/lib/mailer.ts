/**
 * Mailer
 * Sends payslip PDF via SMTP (Gmail or any SMTP server)
 */

import nodemailer from "nodemailer";
import type { PayslipData } from "./scraper";
import { generatePayslipHtml, generatePdfBuffer } from "./pdf-generator";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    to: process.env.SMTP_TO || process.env.SMTP_USER || "",
  };
}

export async function createTransporter(config?: Partial<SmtpConfig>) {
  const cfg = { ...getSmtpConfig(), ...config };
  
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      // For Gmail, allow self-signed certs in dev
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

export async function testSmtpConnection(config?: Partial<SmtpConfig>): Promise<SendResult> {
  try {
    const transporter = await createTransporter(config);
    await transporter.verify();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP connection failed";
    return { success: false, error: message };
  }
}

export async function sendPayslipEmail(
  payslipData: PayslipData,
  smtpConfig?: Partial<SmtpConfig>
): Promise<SendResult> {
  try {
    const cfg = { ...getSmtpConfig(), ...smtpConfig };
    
    if (!cfg.user || !cfg.pass) {
      throw new Error("SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS.");
    }
    if (!cfg.to) {
      throw new Error("No recipient email configured. Please set SMTP_TO.");
    }

    // Generate HTML and PDF
    const html = generatePayslipHtml(payslipData);
    const pdfBuffer = await generatePdfBuffer(html);

    const transporter = await createTransporter(cfg);

    const periodLabel = payslipData.period || "Current Period";
    const dateLabel = new Date().toLocaleDateString("en-PH", { dateStyle: "long" });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 32px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1a472a, #2d6a4f); color: white; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .body { padding: 24px 32px; }
    .body p { line-height: 1.6; color: #555; }
    .period { background: #e8f5e9; border-left: 4px solid #2d6a4f; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; font-weight: 600; color: #1a472a; }
    .footer { background: #f9f9f9; border-top: 1px solid #eee; padding: 16px 32px; font-size: 11px; color: #999; }
    .chip { display: inline-block; background: #e8f5e9; color: #2d6a4f; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Payslip is Ready 🎉</h1>
      <p>CPI Outsourcing – ClickPay Payroll</p>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p>Your payslip has been automatically fetched and is attached to this email as a PDF.</p>
      <div class="period">Pay Period: ${periodLabel}</div>
      <p>Please find your detailed earnings and deductions breakdown in the attached <strong>payslip.pdf</strong>.</p>
      <p>This email was auto-generated on <strong>${dateLabel}</strong> by your Payslip Automator.</p>
    </div>
    <div class="footer">
      Auto-generated — do not reply to this email. &nbsp;|&nbsp; Payslip Automator
    </div>
  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"Payslip Automator" <${cfg.from}>`,
      to: cfg.to,
      subject: `🧾 Payslip: ${periodLabel} — ${dateLabel}`,
      html: emailHtml,
      attachments: [
        {
          filename: `payslip-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: `payslip-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}.html`,
          content: html,
          contentType: "text/html",
        },
      ],
    });

    console.log(`[Mailer] Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    console.error("[Mailer] Error:", message);
    return { success: false, error: message };
  }
}
