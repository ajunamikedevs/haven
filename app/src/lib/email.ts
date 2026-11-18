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

/** A short email with one button, in Haven's colours. */
function simpleEmail(subject: string, lines: string[], button: { label: string; url: string }, footnote: string): Omit<Email, 'to'> {
  return {
    subject,
    text: `${lines.join('\n\n')}\n\n${button.label}: ${button.url}\n\n${footnote}`,
    html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#2C2A28;max-width:480px">
${lines.map((l) => `<p>${esc(l)}</p>`).join('\n')}
<p><a href="${esc(button.url)}" style="display:inline-block;background:#A65D40;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:14px">${esc(button.label)}</a></p>
<p style="color:#6B6560;font-size:14px">${esc(footnote)}</p>
</div>`,
  };
}

export function trialEndingEmail(endsOn: string, url: string): Omit<Email, 'to'> {
  return simpleEmail(
    'Your Haven trial ends ' + endsOn,
    [`Your free trial of Haven ends ${endsOn}.`, 'To keep planning, pick a plan: $5 a month, or $48 a year. If you don’t, everything you planned stays there to read, and you can subscribe any time to pick up where you left off.'],
    { label: 'See plans', url },
    'You’re getting this because you started a Haven trial. It’s the only reminder we’ll send.',
  );
}

export function firstWeekNudgeEmail(url: string): Omit<Email, 'to'> {
  return simpleEmail(
    'Plan your first week in Haven',
    [
      'You started Haven but haven’t planned a week yet. It takes about five minutes.',
      'The quickest start: add your household, put in the evenings that are already busy, then tap “Fill them” and Haven suggests a dinner for every open night. The grocery list builds itself, and you can send it to whoever does the shop.',
    ],
    { label: 'Plan this week', url },
    'You’re getting this because you started a Haven trial. We won’t send another one like it.',
  );
}

export function trialEndedEmail(endedOn: string, url: string): Omit<Email, 'to'> {
  return simpleEmail(
    'Your Haven trial has ended',
    [
      `Your free trial of Haven ended ${endedOn}. Everything you planned is still there to read.`,
      'To keep planning, pick a plan: $5 a month, or $48 a year. You pick up exactly where you left off.',
    ],
    { label: 'Pick a plan', url },
    'You’re getting this because your Haven trial ended. It’s the only email we’ll send about it.',
  );
}

export function paymentFailedEmail(url: string): Omit<Email, 'to'> {
  return simpleEmail(
    'Your Haven payment didn’t go through',
    ['We couldn’t take this period’s payment for Haven. Nothing changes yet: you can keep planning while the payment is retried.', 'AgentaOS, who handle Haven’s payments, will email you about updating your card.'],
    { label: 'Check your plan', url },
    'You’re getting this because you have a Haven subscription.',
  );
}
