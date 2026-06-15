import SettingsClient from "@/components/SettingsClient";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0d1117]">
      <nav className="border-b border-[#30363d] bg-[#161b22] px-6 py-3 flex items-center gap-4">
        <Link href="/" className="btn-secondary text-xs py-1.5 px-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4ade80] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-white">Settings</span>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <SettingsClient />
      </div>
    </div>
  );
}
