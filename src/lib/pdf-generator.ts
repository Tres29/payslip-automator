/**
 * PDF Generator
 * Converts payslip data into a styled PDF buffer
 */

import type { PayslipData } from "./scraper";

export function generatePayslipHtml(data: PayslipData): string {
  const earningsRows = data.earnings
    .map(
      (e) => `
    <tr>
      <td class="desc">${e.description}</td>
      <td class="num">${e.hours || ""}</td>
      <td class="num">${e.amount}</td>
    </tr>`
    )
    .join("");

  const ytdRows = "";

  const deductionRows = data.deductions
    .map(
      (d) => `
    <tr>
      <td class="desc">${d.description}</td>
      <td class="num">${d.amount}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip – ${data.period}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #f9f9f9;
      padding: 32px;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%);
      color: white;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header .company { font-size: 11px; opacity: 0.8; margin-top: 4px; }
    .header .meta { text-align: right; font-size: 11px; opacity: 0.9; line-height: 1.6; }
    .period-bar {
      background: #f3f4ff;
      border-left: 4px solid #4f46e5;
      padding: 14px 28px;
      font-size: 12px;
      color: #3730a3;
      font-weight: 700;
      border-radius: 0 0 12px 12px;
      margin-top: 12px;
    }
    .body { padding: 24px 28px; line-height: 1.5; }
    .top-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .company-block {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .company-block h1 {
      font-size: 24px;
      margin-bottom: 4px;
      letter-spacing: 0.4px;
    }
    .company-block .company {
      font-size: 11px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .invoice-block {
      text-align: right;
      min-width: 180px;
    }
    .invoice-block .label {
      display: block;
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .invoice-block .value {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
      display: block;
    }
    .tables-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .table-block {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #111827;
      margin-bottom: 14px;
    }
    table { width: 100%; border-collapse: collapse; border: none; }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      color: #4b5563;
      letter-spacing: 0.5px;
      padding: 12px 10px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; color: #334155; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.desc { color: #111827; }
    tr:last-child td { border-bottom: none; }
    .table-block + .table-block { margin-top: 0; }
    .totals {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 26px;
    }
    .total-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 100px;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
    }
    .total-box.net {
      background: #111827;
      color: white;
      border-color: #111827;
      grid-column: 1 / -1;
    }
    .total-box .label { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; opacity: 0.75; }
    .total-box .value { font-size: 22px; font-weight: 700; }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding: 18px 32px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #6b7280;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #eef2ff;
      color: #4338ca;
      font-size: 10px;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 999px;
      margin-top: 4px;
      letter-spacing: 0.8px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-block">
        <h1>Foundever Payroll</h1>
        <div class="company">ClickPay Online Payroll Statement</div>
        <span class="badge">PAYSLIP</span>
      </div>
      <div class="invoice-block">
        <span class="label">Generated</span>
        <span class="value">${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</span>
        <span class="label">Statement</span>
        <span class="value">${data.period || "Latest Payroll"}</span>
      </div>
    </div>

    <div class="period-bar">
      Latest Payslip / Current Pay Period
    </div>

    <div class="body">
      <div class="tables-row">
        <div class="table-block">
          <h3>Earnings</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right">Hrs</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${earningsRows || '<tr><td colspan="3" style="color:#999; text-align:center; padding:12px;">No earnings data</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="table-block">
          <h3>Deductions</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${deductionRows || '<tr><td colspan="2" style="color:#999; text-align:center; padding:12px;">No deductions</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="totals">
        <div class="total-box">
          <span class="label">Total Taxable Income</span>
          <span class="value">₱ ${data.totalTaxableIncome || "—"}</span>
        </div>
        <div class="total-box">
          <span class="label">Total Deductions</span>
          <span class="value">₱ ${data.totalDeductions || "—"}</span>
        </div>
        <div class="total-box net">
          <span class="label" style="opacity:0.7">Total Net Pay</span>
          <span class="value">₱ ${data.netPay || "—"}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>This is a system-generated payslip. No signature required.</span>
      <span>Scraped: ${new Date(data.scrapedAt).toLocaleString("en-PH")}</span>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePdfBuffer(html: string): Promise<Buffer> {
  try {
    // Try using puppeteer for PDF generation (more reliable)
    let browser;
    
    if (process.env.NODE_ENV === "production" || process.env.USE_CHROMIUM === "true") {
      const chromium = await import("@sparticuz/chromium");
      const puppeteer = await import("puppeteer-core");
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("[PDF] Puppeteer PDF failed, trying html-pdf-node:", error);
    
    // Fallback to html-pdf-node
    const htmlPdf = await import("html-pdf-node");
    const file = { content: html };
    const options = { format: "A4", printBackground: true };
    
    return new Promise((resolve, reject) => {
      htmlPdf.default.generatePdf(file, options, (err: Error | null, buffer: Buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });
  }
}
