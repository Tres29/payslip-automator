import { NextRequest, NextResponse } from "next/server";
import { testSmtpConnection, createTransporter } from "@/lib/mailer";
import { loadSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const settings = loadSettings();
  
  const config = {
    host: body.smtpHost || settings.smtpHost,
    port: body.smtpPort || settings.smtpPort,
    secure: body.smtpSecure ?? settings.smtpSecure,
    user: body.smtpUser || settings.smtpUser,
    pass: (body.smtpPass && body.smtpPass !== "••••••••") ? body.smtpPass : settings.smtpPass,
    from: body.smtpFrom || settings.smtpFrom,
    to: body.smtpTo || settings.smtpTo,
  };

  if (!config.user || !config.pass) {
    return NextResponse.json({ success: false, error: "SMTP credentials not set" }, { status: 400 });
  }

  // First test connection
  const connResult = await testSmtpConnection(config);
  if (!connResult.success) {
    return NextResponse.json({ 
      success: false, 
      error: `SMTP connection failed: ${connResult.error}`,
      tip: config.host === "smtp.gmail.com" 
        ? "For Gmail, make sure you're using an App Password (not your regular password). Enable 2FA first, then go to Google Account → Security → App passwords."
        : undefined
    });
  }

  // Send test email
  try {
    const transporter = await createTransporter(config);
    await transporter.sendMail({
      from: `"Payslip Automator Test" <${config.from}>`,
      to: config.to,
      subject: "✅ Payslip Automator — SMTP Test Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; padding: 24px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #2d6a4f;">
          <h2 style="color: #1a472a; margin-top: 0;">✅ SMTP Test Successful!</h2>
          <p>Your Payslip Automator is correctly configured and can send emails.</p>
          <p style="color: #666; font-size: 13px;">
            Your payslip will be automatically fetched and emailed to you on the <strong>13th</strong> and <strong>28th</strong> of every month.
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
          <p style="font-size: 11px; color: #999;">Sent from Payslip Automator · ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (Manila time)</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${config.to}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ success: false, error: message });
  }
}
