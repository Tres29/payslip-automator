import Link from "next/link";
import { Calendar, Mail, Settings, Zap, Shield, Clock } from "lucide-react";
import DashboardClient from "@/components/DashboardClient";

export default function HomePage() {
  // Get next scheduled dates
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let next13 = new Date(currentYear, currentMonth, 13, 8, 0, 0);
  let next28 = new Date(currentYear, currentMonth, 28, 8, 0, 0);

  if (next13 <= now) next13 = new Date(currentYear, currentMonth + 1, 13, 8, 0, 0);
  if (next28 <= now) next28 = new Date(currentYear, currentMonth + 1, 28, 8, 0, 0);

  const nextScheduled = next13 < next28 ? next13 : next28;
  const daysUntilNext = Math.ceil((nextScheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Top nav */}
      <nav className="border-b border-[#30363d] bg-[#161b22] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4ade80] flex items-center justify-center">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Payslip Automator</h1>
            <p className="text-xs text-[#8b949e]">Foundever Payroll</p>
          </div>
        </div>
        <Link href="/settings" className="btn-secondary text-xs py-1.5 px-3">
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Hero status card */}
        <div className="card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#4ade80] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] ping-slow" />
                <span className="text-xs text-[#4ade80] font-medium uppercase tracking-wide">Automator Active</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Automated Payslip</h2>
              <p className="text-[#8b949e] text-sm max-w-md">
                Your payslip is automatically send and emailed to you on the{" "}
                <span className="text-white font-medium">13th</span> and{" "}
                <span className="text-white font-medium">28th</span> of every month.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-[#8b949e] mb-1">Next scheduled run</p>
              <p className="text-2xl font-bold text-[#4ade80] font-mono">
                {daysUntilNext}d
              </p>
              <p className="text-xs text-[#8b949e]">
                {nextScheduled.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} @ 8:00 AM
              </p>
            </div>
          </div>
        </div>

        {/* Schedule preview */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { day: "13th", label: "Mid-month", icon: Calendar },
            { day: "28th", label: "End of month", icon: Calendar },
          ].map(({ day, label, icon: Icon }) => {
            const d = day === "13th" ? next13 : next28;
            const isPast = d <= now;
            return (
              <div key={day} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-[#8b949e]" />
                  <span className="section-title">{label}</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{day}</p>
                <p className="text-xs text-[#8b949e]">
                  {d.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-[#4ade80] mt-1">8:00 AM Manila time</p>
              </div>
            );
          })}
        </div>

        {/* Manual trigger + actions */}
        <DashboardClient />

        {/* How it works */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">How it works</h3>
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: "Secure auto-login",
                desc: "Puppeteer headless browser logs into ClickPay with your saved credentials — same as you would manually.",
              },
              {
                icon: Zap,
                title: "Payslip extraction",
                desc: "Scrapes your current payslip data including earnings, deductions, and net pay.",
              },
              {
                icon: Mail,
                title: "PDF email delivery",
                desc: "Converts to a styled PDF and sends it to your Gmail via SMTP on the 13th and 28th.",
              },
              {
                icon: Clock,
                title: "Scheduled via Vercel Cron",
                desc: "Runs automatically at 8 AM Manila time — no need to remember or do anything manually.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#4ade80]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-[#8b949e] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
