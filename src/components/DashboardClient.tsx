"use client";

import { useState } from "react";
import { Play, ExternalLink, CheckCircle, XCircle, Loader2, Eye } from "lucide-react";

interface TriggerResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: {
    period: string;
    netPay: string;
    earningsCount: number;
    deductionsCount: number;
    sentTo: string;
    scrapedAt: string;
  };
}

export default function DashboardClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/trigger", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Network error — check your connection" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setPreviewLoading(true);
    window.open("/api/trigger", "_blank");
    setTimeout(() => setPreviewLoading(false), 2000);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Manual Trigger</h3>
        <span className="text-xs text-[#8b949e] bg-[#0d1117] px-2 py-1 rounded-md border border-[#30363d]">
          Run on demand
        </span>
      </div>

      <p className="text-sm text-[#8b949e] mb-4">
        Fetch your latest payslip right now and send it to your email. Useful for testing or if you need it outside the scheduled dates.
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleTrigger}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? "Fetching payslip..." : "Fetch & Email Now"}
        </button>

        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="btn-secondary"
        >
          <Eye className="w-4 h-4" />
          Preview Payslip HTML
        </button>

        <a
          href="https://clickpay.cpi-outsourcing.com/fai/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          <ExternalLink className="w-4 h-4" />
          Open ClickPay
        </a>
      </div>

      {/* Result feedback */}
      {result && (
        <div
          className={`mt-4 rounded-lg p-4 border ${
            result.success
              ? "bg-[#0f2a1a] border-[#1a4731] text-[#4ade80]"
              : "bg-[#2a0f0f] border-[#4a1a1a] text-[#f87171]"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="text-sm font-medium">
              {result.success ? result.message : result.error}
            </span>
          </div>

          {result.success && result.details && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-white/50 mb-0.5">Period</p>
                <p className="text-white font-medium">{result.details.period || "—"}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-white/50 mb-0.5">Net Pay</p>
                <p className="text-white font-medium">₱ {result.details.netPay || "—"}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-white/50 mb-0.5">Sent to</p>
                <p className="text-white font-medium">{result.details.sentTo}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-white/50 mb-0.5">Items</p>
                <p className="text-white font-medium">
                  {result.details.earningsCount} earnings · {result.details.deductionsCount} deductions
                </p>
              </div>
            </div>
          )}

          {!result.success && result.error?.includes("credentials") && (
            <p className="text-xs mt-2 text-white/50">
              → Go to <a href="/settings" className="underline">Settings</a> to configure your login details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
