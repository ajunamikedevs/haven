import 'server-only';
import { appendFile, mkdir } from 'node:fs/promises';

type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends a transactional email through Resend. In local development, with no RESEND_API_KEY,
 * the message is printed to the server console and appended to .data/outbox.jsonl instead, so
 * sign-in links can be followed by hand and read by the end-to-end tests.
 */
export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set');
    console.log(`\n[email not sent: no RESEND_API_KEY]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    await mkdir('.data', { recursive: true });
    await appendFile('.data/outbox.jsonl', JSON.stringify({ to: email.to, subject: email.subject, text: email.text }) + '\n');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Haven <onboarding@resend.dev>', to: email.to, subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) throw new Error(`Email could not be sent (${res.status})`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function magicLinkEmail(url: string): Omit<Email, 'to'> {
  return {
    subject: 'Your sign-in link for Haven',
    text: `Open this link to sign in to Haven:\n\n${url}\n\nIt works once and expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#2C2A28;max-width:480px">
<p>Open this link to sign in to Haven:</p>
<p><a href="${esc(url)}" style="display:inline-block;background:#A65D40;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:14px">Sign in to Haven</a></p>
<p style="color:#6B6560;font-size:14px">It works once and expires in 10 minutes. If you didn’t ask for it, you can ignore this email.</p>
</div>`,
  };
}
