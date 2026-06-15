import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = loadSettings();
    
    // Mask passwords in response
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        clickpayPassword: settings.clickpayPassword ? "••••••••" : "",
        smtpPass: settings.smtpPass ? "••••••••" : "",
        // Return booleans indicating if passwords are set
        hasClickpayPassword: !!settings.clickpayPassword,
        hasSmtpPass: !!settings.smtpPass,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // If password fields are placeholder, don't overwrite
    const current = loadSettings();
    const toSave = { ...body };
    
    if (toSave.clickpayPassword === "••••••••") {
      toSave.clickpayPassword = current.clickpayPassword;
    }
    if (toSave.smtpPass === "••••••••") {
      toSave.smtpPass = current.smtpPass;
    }
    
    saveSettings(toSave);
    
    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
