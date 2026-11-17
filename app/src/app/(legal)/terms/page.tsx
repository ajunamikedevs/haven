import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="sub">Last updated November 17, 2026</p>

      <h2>The short version</h2>
      <p>Haven helps one person plan a household’s week: the calendar, dinners and a grocery list. You can try it free for 14 days. After that it costs $5 a month or $48 a year for the whole household. You can cancel any time, and what you planned stays readable after a subscription ends.</p>

      <h2>Your account</h2>
      <p>The person who signs up (the organizer) owns the account and the household in it. Keep access to your email address secure, because sign-in links are sent there. You must be old enough to enter a contract where you live.</p>

      <h2>Shared links</h2>
      <p>You can send links to the week or the grocery list to the people you live with. Anyone who has a link can open it, and a grocery link lets them tick items off. Only share links with people you trust, and switch a link off in Settings if it goes somewhere it shouldn’t.</p>

      <h2>Free trial and subscriptions</h2>
      <ul>
        <li>The trial lasts 14 days and needs no card. When it ends, your household becomes read-only until you subscribe.</li>
        <li>Subscriptions are sold by <strong>AgentaOS</strong>, our merchant of record. AgentaOS takes the payment, handles sales tax and VAT, and sends your receipts. Their checkout terms apply to the payment itself.</li>
        <li>Subscriptions renew automatically at the end of each month or year until cancelled. Cancel from <em>Plan and billing</em>; you keep full access until the end of the period you paid for.</li>
        <li>If a renewal payment fails, you keep access while the payment is retried. If it can’t be collected, the household becomes read-only.</li>
        <li>We’ll give at least 30 days’ notice by email before changing the price of an existing subscription.</li>
      </ul>
      <p>Refunds are covered in the <Link href="/refunds">Refund Policy</Link>.</p>

      <h2>Your content</h2>
      <p>What you put into Haven (names, events, meals, lists) is yours. You give us permission to store and show it to you and to the people you share links with, only so Haven can work. You can export it or delete it at any time from Settings.</p>

      <h2>Acceptable use</h2>
      <p>Don’t use Haven to break the law, to harass anyone, to store other people’s information without a good reason, or to try to break or overload the service.</p>

      <h2>Availability and changes</h2>
      <p>We work to keep Haven running and your data safe, but we can’t promise it will never be unavailable. We may change or improve features. If we ever shut Haven down, we’ll give at least 60 days’ notice so you can export your data, and refund any unused part of an annual plan.</p>

      <h2>Liability</h2>
      <p>Haven is a planning tool. To the extent the law allows, Haven is provided “as is”, and our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing here limits rights you have under consumer law that can’t be limited.</p>

      <h2>Ending your account</h2>
      <p>You can delete your account at any time from Settings. We may suspend an account that breaks these terms, and will tell you why unless the law prevents it.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: reply to any email from Haven.</p>
    </>
  );
}
