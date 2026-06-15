import { NextRequest, NextResponse } from "next/server";
import { loadSettings } from "@/lib/settings";
import { scrapePayslip } from "@/lib/scraper";
import { sendPayslipEmail } from "@/lib/mailer";
import { generatePayslipHtml } from "@/lib/pdf-generator";

// This route can be called:
// 1. Manually from the dashboard
// 2. By Vercel Cron Jobs automatically on 13th and 28th

export async function POST(req: NextRequest) {
  // Verify cron secret for automated calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow requests from same origin (dashboard button)
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const host = req.headers.get("host");
    const isSameOrigin = origin?.includes(host || "");
    
    if (!isSameOrigin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const settings = loadSettings();

  if (!settings.clickpayUsername || !settings.clickpayPassword) {
    return NextResponse.json(
      { success: false, error: "Credentials not configured. Please set up your settings first." },
      { status: 400 }
    );
  }

  try {
    // Step 1: Scrape payslip
    console.log("[Trigger] Scraping payslip...");
    const scrapeResult = await scrapePayslip(
      settings.clickpayUsername,
      settings.clickpayPassword,
      settings.clickpayUrl
    );

    if (!scrapeResult.success || !scrapeResult.data) {
      return NextResponse.json(
        { success: false, error: `Scraping failed: ${scrapeResult.error}` },
        { status: 500 }
      );
    }

    // Step 2: Send email
    console.log("[Trigger] Sending email...");
    const emailResult = await sendPayslipEmail(scrapeResult.data, {
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      user: settings.smtpUser,
      pass: settings.smtpPass,
      from: settings.smtpFrom,
      to: settings.smtpTo,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Email failed: ${emailResult.error}`,
          payslipData: {
            period: scrapeResult.data.period,
            netPay: scrapeResult.data.netPay,
            earnings: scrapeResult.data.earnings.length,
            deductions: scrapeResult.data.deductions.length,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payslip fetched and emailed successfully!",
      details: {
        period: scrapeResult.data.period,
        netPay: scrapeResult.data.netPay,
        earningsCount: scrapeResult.data.earnings.length,
        deductionsCount: scrapeResult.data.deductions.length,
        emailMessageId: emailResult.messageId,
        sentTo: settings.smtpTo,
        scrapedAt: scrapeResult.data.scrapedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[Trigger] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET: Called by Vercel Cron OR used to preview payslip HTML in browser
export async function GET(req: NextRequest) {
  const settings = loadSettings();

  if (!settings.clickpayUsername || !settings.clickpayPassword) {
    return new NextResponse("<h1>Credentials not configured. Go to /settings.</h1>", {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  // Check if this is a Vercel Cron call (has authorization header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Also detect Vercel's internal cron caller
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";

  try {
    const scrapeResult = await scrapePayslip(
      settings.clickpayUsername,
      settings.clickpayPassword,
      settings.clickpayUrl
    );

    if (!scrapeResult.success || !scrapeResult.data) {
      if (isCronCall || isVercelCron) {
        return NextResponse.json({ success: false, error: scrapeResult.error }, { status: 500 });
      }
      return new NextResponse(`<h1 style="font-family:sans-serif;color:red">Scrape Error: ${scrapeResult.error}</h1>`, {
        headers: { "Content-Type": "text/html" },
        status: 500,
      });
    }

    // If called by cron, send email instead of returning HTML
    if (isCronCall || isVercelCron) {
      const { sendPayslipEmail } = await import("@/lib/mailer");
      const emailResult = await sendPayslipEmail(scrapeResult.data, {
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom,
        to: settings.smtpTo,
      });
      return NextResponse.json({
        success: emailResult.success,
        message: emailResult.success ? "Cron: payslip emailed" : emailResult.error,
        period: scrapeResult.data.period,
      });
    }

    // Otherwise return HTML preview for browser
    const html = generatePayslipHtml(scrapeResult.data);
    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isCronCall || isVercelCron) {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
    return new NextResponse(`<h1 style="font-family:sans-serif;color:red">Error: ${message}</h1>`, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
}
