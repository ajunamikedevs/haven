import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="sub">Last updated November 17, 2026</p>

      <h2>The short version</h2>
      <p>Haven keeps what you plan so you can plan it. We don’t sell your data, we don’t show ads, and we don’t use advertising cookies. You can export or delete everything at any time.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> the organizer’s email address and name, and, if you sign in with Google, the basic profile Google shares (name, email, picture).</li>
        <li><strong>Your household’s plan:</strong> the names and roles you enter for people, events, dinners, grocery items and what’s been ticked off. People you share links with don’t need an account and we don’t collect anything about them beyond what they tick.</li>
        <li><strong>Billing status:</strong> your plan, its status and renewal date, from AgentaOS. We never see or store card details.</li>
        <li><strong>Usage:</strong> anonymous page views (Vercel Web Analytics, which uses no cookies) and a small set of product events such as “signed up” or “planned all seven dinners”. These record that something happened, never what you wrote.</li>
        <li><strong>Errors:</strong> when something breaks, a report of the error and the page it happened on, with emails and household content removed.</li>
        <li><strong>Security:</strong> session cookies to keep you signed in, and short-lived records such as sign-in links and rate limits.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the companies that run parts of Haven for us, and only what each needs:</p>
      <ul>
        <li><strong>AgentaOS</strong>, our merchant of record, for payments, tax, invoices and receipts. AgentaOS is the seller of your subscription and processes your payment details under its own privacy policy.</li>
        <li><strong>Vercel</strong> (hosting and analytics) and <strong>Neon</strong> (database), which store and serve Haven.</li>
        <li><strong>Resend</strong>, which delivers sign-in and billing emails.</li>
        <li><strong>Google</strong>, only if you choose to sign in with Google.</li>
        <li>An error-monitoring service, which receives error reports with personal details removed.</li>
      </ul>
      <p>We share data with authorities only when the law requires it.</p>

      <h2>Shared links</h2>
      <p>Anyone with a link you send can see that week or grocery list. Links don’t show your email address. You can switch any link off in Settings.</p>

      <h2>How long we keep it</h2>
      <p>Your household’s data is kept while your account exists, including after a subscription ends, so you can come back to it. When you delete your account, your household and account are removed straight away; backups roll off within 30 days. AgentaOS keeps payment records for as long as tax law requires.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Export:</strong> download everything in your household as a file from Settings.</li>
        <li><strong>Delete:</strong> delete your account and household from Settings.</li>
        <li><strong>Correct:</strong> edit anything in the app.</li>
        <li>Depending on where you live, you may also have rights to object to or restrict how we use your data, and to complain to a data-protection authority.</li>
      </ul>

      <h2>Children</h2>
      <p>Accounts are for adults. A household can include children’s names and activities entered by the organizer; please enter only what’s needed to plan the week.</p>

      <h2>Contact</h2>
      <p>Questions or requests about your data: reply to any email from Haven.</p>
    </>
  );
}
