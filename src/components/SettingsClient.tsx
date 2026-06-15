"use client";

import { useState, useEffect } from "react";
import {
  Save, TestTube, Eye, EyeOff, CheckCircle, XCircle,
  Loader2, User, Mail, Clock, Info, AlertTriangle
} from "lucide-react";

interface Settings {
  clickpayUsername: string;
  clickpayPassword: string;
  clickpayUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpTo: string;
  scheduleDay13Hour: number;
  scheduleDay28Hour: number;
  sendHtmlAttachment: boolean;
  sendPdfAttachment: boolean;
  hasClickpayPassword?: boolean;
  hasSmtpPass?: boolean;
}

type Status = { type: "success" | "error" | "info"; message: string } | null;

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#4ade80]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-[#8b949e] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null;
  const colors = {
    success: "bg-[#0f2a1a] border-[#1a4731] text-[#4ade80]",
    error: "bg-[#2a0f0f] border-[#4a1a1a] text-[#f87171]",
    info: "bg-[#0f1f2a] border-[#1a3147] text-[#60a5fa]",
  };
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };
  const Icon = icons[status.type];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${colors[status.type]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{status.message}</span>
    </div>
  );
}

export default function SettingsClient() {
  const [settings, setSettings] = useState<Settings>({
    clickpayUsername: "",
    clickpayPassword: "",
    clickpayUrl: "https://clickpay.cpi-outsourcing.com/fai/",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    smtpTo: "",
    scheduleDay13Hour: 8,
    scheduleDay28Hour: 8,
    sendHtmlAttachment: true,
    sendPdfAttachment: true,
  });

  const [showClickpayPass, setShowClickpayPass] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [saveStatus, setSaveStatus] = useState<Status>(null);
  const [testStatus, setTestStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSettings(data.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings, value: string | number | boolean) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      setSaveStatus(
        data.success
          ? { type: "success", message: "Settings saved successfully!" }
          : { type: "error", message: data.error || "Save failed" }
      );
    } catch {
      setSaveStatus({ type: "error", message: "Network error — could not save" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setTestStatus({ type: "info", message: "Testing SMTP connection..." });
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({ type: "success", message: `✅ ${data.message}` });
      } else {
        setTestStatus({
          type: "error",
          message: `${data.error}${data.tip ? ` — ${data.tip}` : ""}`,
        });
      }
    } catch {
      setTestStatus({ type: "error", message: "Network error during test" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#4ade80]" />
        <span className="ml-3 text-[#8b949e] text-sm">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Configuration</h2>
        <p className="text-sm text-[#8b949e] mt-1">
          Set your ClickPay login and Gmail credentials. All sensitive data is encrypted at rest.
        </p>
      </div>

      {/* ── CPI ClickPay Credentials ── */}
      <div className="card p-6">
        <SectionHeader
          icon={User}
          title="CPI ClickPay Login"
          desc="Your credentials for https://clickpay.cpi-outsourcing.com/fai/"
        />

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Username</label>
            <input
              className="input-field font-mono"
              placeholder="e.g. FAI2037928"
              value={settings.clickpayUsername}
              onChange={(e) => set("clickpayUsername", e.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Password</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showClickpayPass ? "text" : "password"}
                placeholder={settings.hasClickpayPassword ? "••••••••  (saved)" : "Enter password"}
                value={settings.clickpayPassword}
                onChange={(e) => set("clickpayPassword", e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowClickpayPass(!showClickpayPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white transition-colors"
              >
                {showClickpayPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-1.5">ClickPay URL</label>
            <input
              className="input-field font-mono text-xs"
              value={settings.clickpayUrl}
              onChange={(e) => set("clickpayUrl", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Gmail / SMTP ── */}
      <div className="card p-6">
        <SectionHeader
          icon={Mail}
          title="Gmail / SMTP Settings"
          desc="Where to send your payslip. For Gmail, use an App Password — not your real password."
        />

        {/* Gmail App Password tip */}
        <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 mb-5 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="text-xs text-[#8b949e] leading-relaxed">
            <span className="text-[#f59e0b] font-medium">Gmail users:</span> You must use an{" "}
            <strong className="text-white">App Password</strong>, not your regular Gmail password.{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4ade80] underline"
            >
              Generate one here →
            </a>{" "}
            (requires 2-Step Verification to be enabled)
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">SMTP Host</label>
              <input
                className="input-field font-mono text-xs"
                placeholder="smtp.gmail.com"
                value={settings.smtpHost}
                onChange={(e) => set("smtpHost", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Port</label>
              <input
                className="input-field font-mono"
                type="number"
                placeholder="587"
                value={settings.smtpPort}
                onChange={(e) => set("smtpPort", parseInt(e.target.value) || 587)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => set("smtpSecure", !settings.smtpSecure)}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  settings.smtpSecure ? "bg-[#4ade80]" : "bg-[#30363d]"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.smtpSecure ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-xs text-[#8b949e]">Use SSL/TLS (port 465)</span>
            </label>
            <span className="text-xs text-[#484f58]">Leave off for port 587 (STARTTLS)</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Gmail Address</label>
            <input
              className="input-field"
              type="email"
              placeholder="your.email@gmail.com"
              value={settings.smtpUser}
              onChange={(e) => {
                set("smtpUser", e.target.value);
                if (!settings.smtpFrom) set("smtpFrom", e.target.value);
                if (!settings.smtpTo) set("smtpTo", e.target.value);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-1.5">
              App Password{" "}
              <span className="text-[#484f58] font-normal">(16-char Google App Password)</span>
            </label>
            <div className="relative">
              <input
                className="input-field pr-10 font-mono tracking-wider"
                type={showSmtpPass ? "text" : "password"}
                placeholder={settings.hasSmtpPass ? "••••••••  (saved)" : "xxxx xxxx xxxx xxxx"}
                value={settings.smtpPass}
                onChange={(e) => set("smtpPass", e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white transition-colors"
              >
                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">From Address</label>
              <input
                className="input-field text-sm"
                type="email"
                placeholder="your.email@gmail.com"
                value={settings.smtpFrom}
                onChange={(e) => set("smtpFrom", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">Send Payslip To</label>
              <input
                className="input-field text-sm"
                type="email"
                placeholder="your.email@gmail.com"
                value={settings.smtpTo}
                onChange={(e) => set("smtpTo", e.target.value)}
              />
            </div>
          </div>

          {/* Attachment options */}
          <div>
            <label className="block text-xs font-medium text-[#8b949e] mb-2">Email Attachments</label>
            <div className="flex gap-4">
              {[
                { key: "sendPdfAttachment" as const, label: "PDF" },
                { key: "sendHtmlAttachment" as const, label: "HTML" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 rounded accent-[#4ade80]"
                  />
                  <span className="text-sm text-white">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Test button */}
          <div className="pt-1">
            <button onClick={handleTestEmail} disabled={testing} className="btn-secondary">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              {testing ? "Testing…" : "Send Test Email"}
            </button>
            {testStatus && (
              <div className="mt-3">
                <StatusBanner status={testStatus} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Schedule ── */}
      <div className="card p-6">
        <SectionHeader
          icon={Clock}
          title="Schedule"
          desc="What hour to run on the 13th and 28th (Manila time, 24h format)"
        />

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "scheduleDay13Hour" as const, label: "13th — Send hour" },
            { key: "scheduleDay28Hour" as const, label: "28th — Send hour" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#8b949e] mb-1.5">{label}</label>
              <select
                className="input-field"
                value={settings[key]}
                onChange={(e) => set(key, parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00 {i < 12 ? "AM" : "PM"} (Manila)
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-[#1c2128] border border-[#30363d] rounded-lg p-3 flex gap-2.5">
          <Info className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
          <div className="text-xs text-[#8b949e] leading-relaxed">
            <span className="text-white font-medium">Vercel Cron:</span> On Vercel, cron jobs are configured in{" "}
            <code className="bg-[#0d1117] px-1 rounded text-[#4ade80] font-mono">vercel.json</code>. The schedule
            above reflects your chosen hour — update <code className="bg-[#0d1117] px-1 rounded text-[#4ade80] font-mono">vercel.json</code>{" "}
            if you change the hour. For local dev, node-cron handles scheduling automatically.
          </div>
        </div>
      </div>

      {/* ── Vercel ENV tip ── */}
      <div className="card p-6">
        <SectionHeader
          icon={Info}
          title="Vercel Deployment"
          desc="Set these environment variables in your Vercel project dashboard for production"
        />
        <div className="bg-[#0d1117] rounded-lg p-4 font-mono text-xs text-[#8b949e] space-y-1 overflow-x-auto">
          {[
            ["CLICKPAY_USERNAME", settings.clickpayUsername || "FAI2037928"],
            ["CLICKPAY_PASSWORD", "your_clickpay_password"],
            ["SMTP_HOST", settings.smtpHost || "smtp.gmail.com"],
            ["SMTP_PORT", String(settings.smtpPort || 587)],
            ["SMTP_USER", settings.smtpUser || "you@gmail.com"],
            ["SMTP_PASS", "your_gmail_app_password"],
            ["SMTP_FROM", settings.smtpFrom || "you@gmail.com"],
            ["SMTP_TO", settings.smtpTo || "you@gmail.com"],
            ["CRON_SECRET", "generate_a_random_secret"],
            ["APP_SECRET", "generate_a_random_32char_string"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-[#4ade80]">{k}</span>
              <span className="text-[#484f58]">=</span>
              <span className="text-white">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#8b949e] mt-3">
          Go to{" "}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4ade80] underline"
          >
            Vercel Dashboard
          </a>{" "}
          → Your Project → Settings → Environment Variables
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save All Settings"}
        </button>
        <StatusBanner status={saveStatus} />
      </div>

      <div className="pb-8" />
    </div>
  );
}
