/**
 * Scheduler
 * 
 * Runs cron jobs on the 13th and 28th of each month.
 * NOTE: On Vercel serverless, true background crons aren't supported.
 * Use Vercel Cron Jobs (vercel.json) instead to call the /api/trigger endpoint.
 * 
 * For local dev, this module starts the node-cron scheduler.
 */

let schedulerStarted = false;

export async function startScheduler() {
  if (schedulerStarted) return;
  if (typeof window !== "undefined") return; // Client-side guard

  try {
    const cron = await import("node-cron");
    const { loadSettings } = await import("./settings");
    const { scrapePayslip } = await import("./scraper");
    const { sendPayslipEmail } = await import("./mailer");

    const settings = loadSettings();
    const hour13 = settings.scheduleDay13Hour || 8;
    const hour28 = settings.scheduleDay28Hour || 8;

    // 13th of every month
    const schedule13 = process.env.CRON_SCHEDULE_13TH || `0 ${hour13} 13 * *`;
    // 28th of every month
    const schedule28 = process.env.CRON_SCHEDULE_28TH || `0 ${hour28} 28 * *`;

    const runPayslipJob = async (label: string) => {
      console.log(`[Scheduler] Running payslip job: ${label}`);
      const s = loadSettings();

      if (!s.clickpayUsername || !s.clickpayPassword) {
        console.error("[Scheduler] No credentials configured");
        return;
      }

      const scrapeResult = await scrapePayslip(s.clickpayUsername, s.clickpayPassword, s.clickpayUrl);
      
      if (!scrapeResult.success || !scrapeResult.data) {
        console.error("[Scheduler] Scrape failed:", scrapeResult.error);
        return;
      }

      const emailResult = await sendPayslipEmail(scrapeResult.data, {
        host: s.smtpHost,
        port: s.smtpPort,
        secure: s.smtpSecure,
        user: s.smtpUser,
        pass: s.smtpPass,
        from: s.smtpFrom,
        to: s.smtpTo,
      });

      if (emailResult.success) {
        console.log(`[Scheduler] ${label} - Email sent successfully: ${emailResult.messageId}`);
      } else {
        console.error(`[Scheduler] ${label} - Email failed: ${emailResult.error}`);
      }
    };

    cron.default.schedule(schedule13, () => runPayslipJob("13th"), {
      timezone: "Asia/Manila",
    });

    cron.default.schedule(schedule28, () => runPayslipJob("28th"), {
      timezone: "Asia/Manila",
    });

    schedulerStarted = true;
    console.log(`[Scheduler] Started — 13th: "${schedule13}", 28th: "${schedule28}" (Asia/Manila)`);
  } catch (error) {
    console.error("[Scheduler] Failed to start:", error);
  }
}
