/**
 * Payslip Scraper
 * Uses Puppeteer to log into ClickPay and extract the current payslip HTML
 */

export interface PayslipData {
  period: string;
  earnings: Array<{ description: string; hours?: string; amount: string }>;
  deductions: Array<{ description: string; amount: string }>;
  totalTaxableIncome: string;
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

async function getBrowser(): Promise<any> {
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
  let browser: any;

  const loginUrl = url?.trim() || "https://clickpay.cpi-outsourcing.com/fai/";
  const safeOrigin = (() => {
    try {
      return new URL(loginUrl).origin;
    } catch {
      return "https://clickpay.cpi-outsourcing.com";
    }
  })();

  try {
    browser = await getBrowser();
    const page: any = await browser.newPage();
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to login page
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Fill login form
    await page.waitForSelector('input[name="username"], input[type="text"], input#username, input[name="user"], input#user, input[name="email"]', { timeout: 10000 });
    
    // Clear and type username
    const usernameField =
      (await page.$('input[name="username"]')) ??
      (await page.$('input#username')) ??
      (await page.$('input[name="user"]')) ??
      (await page.$('input#user')) ??
      (await page.$('input[name="email"]')) ??
      (await page.$('input[type="text"]'));
    if (!usernameField) throw new Error("Username field not found");
    await usernameField.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await usernameField.type(username, { delay: 50 });

    // Clear and type password
    const passwordField =
      (await page.$('input[name="password"]')) ??
      (await page.$('input#password')) ??
      (await page.$('input[name="pass"]')) ??
      (await page.$('input#pass')) ??
      (await page.$('input[type="password"]'));
    if (!passwordField) throw new Error("Password field not found");
    await passwordField.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    await passwordField.type(password, { delay: 50 });

    // Submit login
    const loginButtonSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'input[value="Login"]',
      'input[value="Sign In"]',
      '.login-btn',
      'button.login-btn',
    ];

    let loginBtn: any = null;
    for (const selector of loginButtonSelectors) {
      try {
        loginBtn = await page.$(selector);
      } catch {
        loginBtn = null;
      }
      if (loginBtn) break;
    }

    const tryClickByText = async (selectors: string[], texts: string[]) => {
      return await page.evaluate((selectors: string[], texts: string[]) => {
        const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
        const elements = Array.from(document.querySelectorAll(selectors.join(","))) as HTMLElement[];
        for (const element of elements) {
          const text = normalize(element.textContent || element.getAttribute("value") || "");
          if (texts.some((t: string) => text.includes(t.toLowerCase()))) {
            element.click();
            return true;
          }
        }
        return false;
      }, selectors, texts);
    };

    let clickedViaFallback = false;

    if (!loginBtn) {
      clickedViaFallback = await tryClickByText(
        ["button", "input[type='submit']", "input[type='button']", "a"],
        ["login", "sign in", "sign-in"]
      );
    }

    const clickAndWait = async (action: () => Promise<void>) => {
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
          action(),
        ]);
      } catch {
        await sleep(2000);
      }
    };

    if (loginBtn) {
      await clickAndWait(() => (loginBtn as any).click({ delay: 50 }));
    } else if (clickedViaFallback) {
      await sleep(2000);
    } else {
      await clickAndWait(() => passwordField.press("Enter"));
    }

    // Check if login succeeded
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());

    if (
      pageText.includes("invalid") ||
      pageText.includes("incorrect") ||
      pageText.includes("failed") ||
      currentUrl.toLowerCase().includes("login") ||
      currentUrl.toLowerCase().includes("signin")
    ) {
      throw new Error("Login failed - check your username and password");
    }

    // Navigate to payroll page
    const payrollLink: any = await page.$('a[href*="payroll"], a[href*="payslip"], a[href*="statement"], a[href*="salary"]');
    if (payrollLink) {
      await clickAndWait(() => payrollLink.click());
    } else {
      const clickedPayrollLink = await tryClickByText(
        ["a", "button"],
        ["payslip", "payroll", "salary", "statement"]
      );
      if (!clickedPayrollLink) {
        const fallbackPaths = [
          "/fai/payroll",
          "/fai/payslip",
          "/fai/my-payroll",
          "/fai/my-payslip",
        ];
        let navigated = false;
        for (const path of fallbackPaths) {
          try {
            await page.goto(`${safeOrigin}${path}`, { waitUntil: "networkidle2", timeout: 15000 });
            if ((await page.$("table, .payslip, .paystub, #payslip-content, .earnings")) !== null) {
              navigated = true;
              break;
            }
          } catch {
            // ignore individual fallback failures
          }
        }
        if (!navigated) {
          throw new Error("Payroll page not found after login.");
        }
      }
    }

    const openLatestPayslipEntry = async () => {
      return await page.evaluate(() => {
        const normalize = (value: string) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
        const rows = Array.from(document.querySelectorAll("tr")).reverse();
        for (const row of rows) {
          const links = Array.from(row.querySelectorAll("a, button")) as HTMLElement[];
          for (const link of links) {
            const text = normalize(link.textContent || link.getAttribute("title") || link.getAttribute("aria-label") || "");
            if (/(payslip|payroll|statement|view|open)/.test(text) && !/print/.test(text)) {
              link.click();
              return true;
            }
          }
        }
        return false;
      });
    };

    await sleep(1000);
    const openedLatestPayslip = await openLatestPayslipEntry();
    if (openedLatestPayslip) {
      await sleep(2000);
    }

    // Open printable version if available, so we only scrape the latest payslip page
    const clickedPrintable = await page.evaluate(() => {
      const normalize = (value: string) => (value || "").replace(/\s+/g, " ").trim().toLowerCase();
      const elements = Array.from(document.querySelectorAll("a, button")) as HTMLElement[];
      const printElements = elements
        .filter((element) => {
          const text = normalize(element.textContent || element.getAttribute("title") || element.getAttribute("aria-label") || "");
          return /print|printable|printer friendly|print view|print preview/.test(text);
        })
        .reverse();
      const target = printElements[0];
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (clickedPrintable) {
      await sleep(2000);
    }

    // Wait for payslip content to load
    await page.waitForSelector("table, .payslip, #payslip-content, .earnings, .paystub", {
      timeout: 15000,
    }).catch(() => {});

    // Extract payslip data
    const payslipData = await page.evaluate(() => {
      const getText = (el: Element | null) => el?.textContent?.trim() || "";
      const cleanNumber = (value: string) => value.replace(/[()]/g, "").replace(/[^0-9.,-]/g, "").trim();
      const parseMoney = (value: string) => {
        const cleaned = cleanNumber(value).replace(/,/g, "");
        return isNaN(Number(cleaned)) ? 0 : Number(cleaned);
      };

      const findLabelValue = (root: HTMLElement | Document, labelRegex: RegExp) => {
        const labelCandidates = Array.from(root.querySelectorAll("td, th, span, div, p, strong, label"));
        for (let i = labelCandidates.length - 1; i >= 0; i -= 1) {
          const el = labelCandidates[i];
          const text = getText(el);
          if (labelRegex.test(text)) {
            const row = el.closest("tr");
            const rowText = row ? getText(row).toLowerCase() : "";
            if (/ytd|year[- ]to[- ]date|year to date/i.test(rowText)) {
              continue;
            }
            if (row) {
              const cells = Array.from(row.querySelectorAll("td, th"));
              if (cells.length >= 2) {
                const value = getText(cells[cells.length - 1]);
                if (!/ytd|year[- ]to[- ]date|year to date/i.test(value.toLowerCase())) {
                  return value;
                }
              }
            }
            const next = el.nextElementSibling;
            if (next) {
              const nextText = getText(next);
              if (!/ytd|year[- ]to[- ]date|year to date/i.test(nextText.toLowerCase())) {
                return nextText;
              }
            }
          }
        }
        return "";
      };

      const findPeriodText = (text: string) => {
        const match = text.match(/from\s+\w+\s+\d{1,2},\s+\d{4}\s+to|\d{1,2}\/\d{1,2}\/\d{2,4}|\w+\s+\d{1,2},\s+\d{4}/i);
        return match ? match[0] : "";
      };

      const candidates = Array.from(document.querySelectorAll(".payslip, .payslip-container, .paystub, #payslip-content, table"));
      const scoredCandidates = candidates
        .map((el) => {
          const text = getText(el);
          let score = 0;
          if (/total earnings|gross pay|net pay|deductions|earnings/i.test(text)) score += 2;
          if (/period|pay date|payroll date/i.test(text)) score += 2;
          if (/latest|current|most recent/i.test(text)) score += 1;
          if (findPeriodText(text)) score += 1;
          return { el, score };
        })
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);

      const latestCandidate = scoredCandidates[0]?.el as HTMLElement | undefined;
      const root = latestCandidate || document.body;

      const periodEl = Array.from(root.querySelectorAll(".period, #period, [class*=period], td, th, span, div"))
        .filter((el) => {
          const text = getText(el);
          return /period/i.test(text) || /from\s+\w+\s+\d{1,2},\s+\d{4}\s+to/i.test(text);
        })
        .pop() || null;
      let period = getText(periodEl);

      if (!period) {
        const allCells = Array.from(root.querySelectorAll("td, th, span, div"));
        const periodCell = allCells.find(el => el.textContent?.match(/from\s+\w+\s+\d+,\s+\d{4}\s+to/i));
        if (periodCell) period = getText(periodCell);
      }

      const isYtdText = (text: string) => /ytd|year[- ]to[- ]date|year to date/i.test(text);
      const isSummaryText = (text: string) => /ytd|year[- ]to[- ]date|year to date|total non[- ]taxable|non[- ]taxable|total taxable|gross pay|total deductions|net pay|take[- ]home|grand total|subtotal|balance due|amount due/i.test(text);
      const earnings: Array<{ description: string; hours?: string; amount: string }> = [];
      const deductions: Array<{ description: string; amount: string }> = [];
      const rows = Array.from(root.querySelectorAll("tr"));

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length >= 2) {
          const desc = getText(cells[0]);
          const rowText = getText(row).toLowerCase();
          const lastCell = getText(cells[cells.length - 1]);
          const amountValue = parseMoney(lastCell);
          const isAmount = lastCell && !isNaN(amountValue);

          if (isYtdText(rowText) || isSummaryText(desc.toLowerCase()) || isSummaryText(rowText)) {
            return;
          }

          if (desc && isAmount && !desc.toLowerCase().includes("description")) {
            const normalized = desc.toLowerCase();
            if (normalized.includes("deduction") || normalized.includes("tax") || normalized.includes("sss") || normalized.includes("philhealth") || normalized.includes("pag-ibig") || amountValue < 0) {
              deductions.push({ description: desc, amount: lastCell });
            } else {
              const hours = cells.length >= 3 ? getText(cells[1]) : undefined;
              earnings.push({ description: desc, hours, amount: lastCell });
            }
          }
        }
      });

      let totalTaxableIncome = findLabelValue(root, /total earnings|gross pay|gross salary|earnings total|total pay/i) || "";
      let totalDeductions = findLabelValue(root, /total deductions|deductions total|deduction summary|total deduction/i) || "";
      let netPay = findLabelValue(root, /net pay|take home|take-home pay|net salary|net amount/i) || "";

      if (!totalTaxableIncome && earnings.length > 0) {
        const sum = earnings.reduce((sum, item) => sum + parseMoney(item.amount), 0);
        totalTaxableIncome = sum.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      if (!totalDeductions && deductions.length > 0) {
        const sum = deductions.reduce((sum, item) => sum + parseMoney(item.amount), 0);
        totalDeductions = sum.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      if (!netPay && totalTaxableIncome && totalDeductions) {
        const net = parseMoney(totalTaxableIncome) - parseMoney(totalDeductions);
        netPay = net.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      const payslipSection = latestCandidate || document.querySelector("body") as HTMLElement;
      const rawHtml = payslipSection?.outerHTML || document.body.innerHTML;

      return {
        period,
        earnings,
        deductions,
        totalTaxableIncome: totalTaxableIncome || "0.00",
        totalDeductions: totalDeductions || "0.00",
        netPay: netPay || "0.00",
        rawHtml,
      };
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
