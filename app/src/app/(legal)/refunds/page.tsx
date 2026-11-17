import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundsPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="sub">Last updated November 17, 2026</p>

      <h2>The short version</h2>
      <p>Try Haven free for 14 days before paying anything. If you subscribe and it isn’t right for you, ask within 14 days of a payment and we’ll refund it.</p>

      <h2>How refunds work</h2>
      <ul>
        <li><strong>Within 14 days of any payment</strong> (a first payment or a renewal), you can ask for a full refund of that payment, no questions asked.</li>
        <li><strong>After 14 days</strong>, payments aren’t usually refunded. Cancelling stops the next renewal and you keep access until the end of the period you paid for.</li>
        <li><strong>If Haven was broken</strong> or unavailable for a long stretch, ask anyway: we’ll look at it fairly.</li>
        <li>If Haven ever shuts down, we’ll refund the unused part of any annual plan.</li>
      </ul>

      <h2>Who issues the refund</h2>
      <p>Haven subscriptions are sold by <strong>AgentaOS</strong>, our merchant of record. Refunds are paid back by AgentaOS to the card you paid with, usually within 5 to 10 business days depending on your bank. AgentaOS emails a confirmation.</p>

      <h2>How to ask</h2>
      <p>Reply to your receipt or any email from Haven with “Refund” and the email address on your account. If you’d also like to stop future payments, cancel in <em>Plan and billing</em>.</p>

      <h2>Your legal rights</h2>
      <p>This policy adds to, and doesn’t take away from, any refund or cancellation rights you have under consumer law where you live.</p>
    </>
  );
}
