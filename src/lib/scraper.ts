/**
 * Payslip Scraper
 * Uses Puppeteer to log into ClickPay and extract the current payslip HTML
 */

export interface PayslipData {
  period: string;
  earnings: Array<{ description: string; hours?: string; amount: string }>;
  deductions: Array<{ description: string; amount: string }>;
  totalEarnings: string;
  totalDeductions: string;
  netPay: string;
  rawHtml: string;
  scrapedAt: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: PayslipData;
  error?: string;
}

async function getBrowser() {
  // Use chromium for Vercel serverless, puppeteer for local dev
  if (process.env.NODE_ENV === "production" || process.env.USE_CHROMIUM === "true") {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import("puppeteer");
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
}

export async function scrapePayslip(
  username: string,
  password: string,
  url: string = "https://clickpay.cpi-outsourcing.com/fai/"
): Promise<ScrapeResult> {
  let browser;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to login page
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Fill login form
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });
    
    // Clear and type username
    const usernameField = await page.$('input[name="username"]') || await page.$('input[type="text"]');
    if (!usernameField) throw new Error("Username field not found");
    await usernameField.click({ clickCount: 3 });
    await usernameField.type(username, { delay: 50 });

    // Clear and type password
    const passwordField = await page.$('input[name="password"]') || await page.$('input[type="password"]');
    if (!passwordField) throw new Error("Password field not found");
    await passwordField.click({ clickCount: 3 });
    await passwordField.type(password, { delay: 50 });

    // Submit login
    const loginBtn = await page.$('input[type="submit"], button[type="submit"], .login-btn, input[value="Login"]');
    if (!loginBtn) throw new Error("Login button not found");
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      loginBtn.click(),
    ]);

    // Check if login succeeded
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.includes("Invalid") || pageText.includes("incorrect") || currentUrl.includes("login")) {
      throw new Error("Login failed - check your username and password");
    }

    // Navigate to payroll page
    const payrollLink = await page.$('a[href*="payroll"], a[href*="payslip"]');
    if (payrollLink) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
        payrollLink.click(),
      ]);
    } else {
      // Try direct URL
      const baseUrl = new URL(url).origin;
      await page.goto(`${baseUrl}/fai/payroll`, { waitUntil: "networkidle2", timeout: 15000 });
    }

    // Wait for payslip content to load
    await page.waitForSelector("table, .payslip, #payslip-content, .earnings", {
      timeout: 15000,
    }).catch(() => {});

    // Extract payslip data
    const payslipData = await page.evaluate(() => {
      const getText = (el: Element | null) => el?.textContent?.trim() || "";
      
      // Get period
      const periodEl = document.querySelector(".period, #period, td:contains('Period'), [class*=period]");
      let period = getText(periodEl);
      
      // Fallback: find text containing "from" and "to" dates
      if (!period) {
        const allCells = Array.from(document.querySelectorAll("td, th, span, div"));
        const periodCell = allCells.find(el => el.textContent?.match(/from\s+\w+\s+\d+,\s+\d{4}\s+to/i));
        if (periodCell) period = getText(periodCell);
      }

      // Extract earnings table rows
      const earnings: Array<{ description: string; hours?: string; amount: string }> = [];
      const deductions: Array<{ description: string; amount: string }> = [];

      // Get all table rows
      const rows = Array.from(document.querySelectorAll("tr"));
      
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length >= 2) {
          const desc = getText(cells[0]);
          const lastCell = getText(cells[cells.length - 1]);
          const isAmount = /^-?[\d,]+\.?\d*$/.test(lastCell.replace(/,/g, ""));
          
          if (desc && isAmount && !desc.toLowerCase().includes("description")) {
            // Determine if it's an earning or deduction based on position/value
            if (cells.length === 3) {
              earnings.push({ description: desc, hours: getText(cells[1]), amount: lastCell });
            } else if (cells.length === 2) {
              // Could be deduction
              const amtNum = parseFloat(lastCell.replace(/,/g, ""));
              if (amtNum > 0) {
                deductions.push({ description: desc, amount: lastCell });
              }
            }
          }
        }
      });

      // Get totals from footer/summary rows
      let totalEarnings = "0.00";
      let totalDeductions = "0.00";
      let netPay = "0.00";

      const footerRows = document.querySelectorAll(".total, .net-pay, tfoot tr, .summary td");
      footerRows.forEach(el => {
        const text = getText(el);
        if (text.toLowerCase().includes("total earning")) totalEarnings = text.replace(/[^0-9.,]/g, "");
        if (text.toLowerCase().includes("total deduction")) totalDeductions = text.replace(/[^0-9.,]/g, "");
        if (text.toLowerCase().includes("net pay")) netPay = text.replace(/[^0-9.,]/g, "");
      });

      // Get full page HTML for the payslip section
      const payslipSection = document.querySelector("#payslip-content, .payslip-container, table") as HTMLElement;
      const rawHtml = payslipSection?.outerHTML || document.body.innerHTML;

      return { period, earnings, deductions, totalEarnings, totalDeductions, netPay, rawHtml };
    });

    // Take screenshot for debugging if needed
    // await page.screenshot({ path: '/tmp/payslip-screenshot.png' });

    return {
      success: true,
      data: {
        ...payslipData,
        scrapedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraping error";
    console.error("[Scraper] Error:", message);
    return { success: false, error: message };
  } finally {
    if (browser) await browser.close();
  }
}
