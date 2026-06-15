import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payslip Automator — CPI ClickPay",
  description: "Auto-fetch and email your CPI ClickPay payslip every 13th and 28th",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1117] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
