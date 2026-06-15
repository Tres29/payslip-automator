/**
 * Settings Storage
 * 
 * For LOCAL dev: persists settings in a JSON file (settings.json)
 * For VERCEL: settings are stored as environment variables (set in Vercel dashboard)
 * 
 * The UI shows both methods clearly to the user.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface AppSettings {
  // CPI ClickPay
  clickpayUsername: string;
  clickpayPassword: string;
  clickpayUrl: string;
  // SMTP
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpTo: string;
  // Schedule
  scheduleDay13Hour: number;
  scheduleDay28Hour: number;
  // Misc
  sendHtmlAttachment: boolean;
  sendPdfAttachment: boolean;
}

const SETTINGS_FILE = path.join(process.cwd(), "settings.local.json");
const SECRET = process.env.APP_SECRET || "default-secret-change-me-in-production";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(SECRET, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  try {
    const [ivHex, encrypted] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(SECRET, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return text; // Return as-is if decryption fails (plain text)
  }
}

export function getDefaultSettings(): AppSettings {
  return {
    clickpayUsername: process.env.CLICKPAY_USERNAME || "",
    clickpayPassword: process.env.CLICKPAY_PASSWORD || "",
    clickpayUrl: process.env.CLICKPAY_URL || "https://clickpay.cpi-outsourcing.com/fai/",
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(process.env.SMTP_PORT || "587"),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    smtpTo: process.env.SMTP_TO || process.env.SMTP_USER || "",
    scheduleDay13Hour: 8,
    scheduleDay28Hour: 8,
    sendHtmlAttachment: true,
    sendPdfAttachment: true,
  };
}

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      const stored = JSON.parse(raw);
      
      // Decrypt sensitive fields
      if (stored.clickpayPassword) stored.clickpayPassword = decrypt(stored.clickpayPassword);
      if (stored.smtpPass) stored.smtpPass = decrypt(stored.smtpPass);
      
      return { ...getDefaultSettings(), ...stored };
    }
  } catch (error) {
    console.error("[Settings] Failed to load settings file:", error);
  }
  return getDefaultSettings();
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = loadSettings();
  const merged = { ...current, ...settings };
  
  // Encrypt sensitive fields before saving
  const toSave = { ...merged };
  if (toSave.clickpayPassword) toSave.clickpayPassword = encrypt(toSave.clickpayPassword);
  if (toSave.smtpPass) toSave.smtpPass = encrypt(toSave.smtpPass);
  
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), "utf8");
}

export function maskSecret(value: string): string {
  if (!value || value.length < 4) return "••••";
  return value.slice(0, 2) + "•".repeat(Math.min(value.length - 4, 8)) + value.slice(-2);
}
