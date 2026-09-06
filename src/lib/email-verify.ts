import { nanoid } from 'nanoid';
import { Resend } from 'resend';
import { getDb, type VerificationCodeRow } from './db';

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Otto-Hub <onboarding@resend.dev>';

export function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export function storeCode(email: string, code: string, purpose: string = 'register'): string {
  const id = nanoid(12);
  const db = getDb();
  // Invalidate any previous codes for this email+purpose
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0`).run(email, purpose);
  db.prepare(
    `INSERT INTO verification_codes (id, email, code, purpose, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`
  ).run(id, email, code, purpose, Date.now() + CODE_TTL_MS, Date.now());
  return id;
}

export function verifyCode(email: string, code: string, purpose: string = 'register'): boolean {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM verification_codes WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1`
  ).get(email, purpose) as VerificationCodeRow | undefined;
  if (!row) return false;
  if (row.expires_at < Date.now()) return false;
  if (row.code !== code) return false;
  // Mark as used
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(row.id);
  return true;
}

// Email sending via Resend
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL VERIFICATION] No RESEND_API_KEY configured. Code for ${email}: ${code}`);
    return true; // Allow registration without email in dev
  }
  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Otto-Hub Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Verify your email</h2>
          <p style="color: #666;">Use the following code to complete your registration:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    console.log(`[EMAIL VERIFICATION] Sent code to ${email}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL VERIFICATION] Failed to send to ${email}:`, err);
    return false;
  }
}
