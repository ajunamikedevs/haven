import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon } from '@/components/icon';
import { getSubscriptionRow, receiptsFor } from '@/lib/billing';
import { PRICES } from '@/lib/billing/rules';
import { requireHousehold } from '@/lib/dal';
import { subscribe } from './actions';
import { CancelButton } from './cancel-button';

export const metadata: Metadata = { title: 'Plan and billing' };

type Search = Promise<{ payment?: string; sessionId?: string }>;

export default function BillingPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading your plan…</p>}>
      <Billing searchParams={searchParams} />
    </Suspense>
  );
}

async function Billing({ searchParams }: { searchParams: Search }) {
  const { household, access } = await requireHousehold();
  const { payment, sessionId } = await searchParams;
  const sub = await getSubscriptionRow(household.id);
  const day = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: household.timeZone });
  const planName = sub?.plan === 'annual' ? 'Yearly, $48 a year' : 'Monthly, $5 a month';

  let status: React.ReactNode;
  let canSubscribe = false;
  let cancelUntil: string | null = null;
  switch (access.reason) {
    case 'trial':
      status = <><strong>Free trial: {access.trialDaysLeft} {access.trialDaysLeft === 1 ? 'day' : 'days'} left.</strong> It ends {day(household.trialEndsAt)}. No card needed until you pick a plan.</>;
      canSubscribe = true;
      break;
    case 'subscribed':
      if (access.endsOn) status = <><strong>{planName}.</strong> It won’t renew: you have Haven until {day(access.endsOn)}.</>;
      else {
        status = <><strong>{planName}.</strong>{sub?.currentPeriodEnd ? <> Renews {day(sub.currentPeriodEnd)}.</> : null}</>;
        cancelUntil = sub?.currentPeriodEnd ? day(sub.currentPeriodEnd) : 'the end of this period';
      }
      break;
    case 'payment_retrying':
      status = <><strong>{planName}.</strong> The last payment didn’t go through and is being retried. Look for an email from AgentaOS about updating your card. You can keep planning meanwhile.</>;
      cancelUntil = 'the end of this period';
      break;
    case 'paid_until':
      status = <><strong>Your plan has been cancelled.</strong> You have Haven until {day(access.endsOn)}, and can subscribe again after that.</>;
      break;
    default:
      status = <><strong>{access.reason === 'trial_ended' ? 'Your free trial has ended.' : 'Your subscription has ended.'}</strong> Everything you planned is still here to read. Pick a plan to keep planning.</>;
      canSubscribe = true;
  }

  const receipts = sub ? await receiptsFor(household.id) : [];

  return (
    <div className="narrow billing">
      <div className="page-head"><div><h1>Plan and billing</h1><p className="sub">One plan, everything included.</p></div></div>
      <PaymentNotice result={payment} sessionId={sessionId} />

      <section className="card billing-status" aria-labelledby="statusTitle">
        <h2 id="statusTitle" className="sr">Your plan</h2>
        <p id="planStatus">{status}</p>
        {cancelUntil && <div className="row"><CancelButton endsOn={cancelUntil} /></div>}
      </section>

      {canSubscribe && (
        <section aria-labelledby="plansTitle">
          <h2 id="plansTitle" className="section-title">Choose a plan</h2>
          <div className="plans">
            <form action={subscribe} className="card plan">
              <input type="hidden" name="plan" value="monthly" />
              <h3>Monthly</h3>
              <p className="price"><strong>${PRICES.monthly.amount}</strong> a month</p>
              <p className="muted">Cancel any time.</p>
              <button className="btn btn-secondary" type="submit">Choose monthly</button>
            </form>
            <form action={subscribe} className="card plan">
              <input type="hidden" name="plan" value="annual" />
              <h3>Yearly <span className="p-pill">Save $12</span></h3>
              <p className="price"><strong>${PRICES.annual.amount}</strong> a year</p>
              <p className="muted">Works out at $4 a month.</p>
              <button className="btn btn-primary" type="submit">Choose yearly</button>
            </form>
          </div>
          <p className="muted fine">Prices in US dollars. Sales tax or VAT is added at checkout where it applies. By subscribing you agree to the <Link href="/terms">Terms</Link> and <Link href="/refunds">Refund Policy</Link>.</p>
        </section>
      )}

      {sub && (
        <section className="card" aria-labelledby="receiptsTitle" style={{ padding: 20 }}>
          <h2 id="receiptsTitle" style={{ fontSize: 16 }}>Receipts</h2>
          {receipts === null ? <p className="muted">Receipts couldn’t be loaded just now. They’re also in your email from AgentaOS.</p>
            : receipts.length === 0 ? <p className="muted">No receipts yet.</p>
              : (
                <ul className="receipts">
                  {receipts.map((r) => (
                    <li key={r.id}>
                      <span>{day(new Date(r.issuedAt))}</span>
                      <span className="muted">{r.number}</span>
                      <strong>${r.amount.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
              )}
        </section>
      )}

      <p className="note"><Icon name="lock" size="sm" /><span>Payments are handled by AgentaOS, Haven’s merchant of record. They take the payment, charge any sales tax, and email your receipts. Switching between monthly and yearly isn’t available yet: cancel, and choose the other plan when the current one ends.</span></p>
    </div>
  );
}

const NOTICES = {
  paid: { icon: 'check', title: 'You’re all set', body: 'Thanks for subscribing. Your receipt is on its way from AgentaOS.' },
  waiting: { icon: 'clock', title: 'Waiting for your payment to confirm', body: 'This usually takes a few seconds. Nothing is lost if you leave this page.' },
  not_paid: { icon: 'bell', title: 'The payment didn’t go through', body: 'Nothing was charged. You can pick a plan again whenever you’re ready.' },
  unknown: { icon: 'bell', title: 'We couldn’t find that payment', body: 'If you were charged, it will show here within a few minutes.' },
} as const;

/** The outcome of a checkout, after /billing/return has checked it with AgentaOS. */
function PaymentNotice({ result, sessionId }: { result?: string; sessionId?: string }) {
  if (!result || !(result in NOTICES)) return null;
  const n = NOTICES[result as keyof typeof NOTICES];
  return (
    <section className="card billing-status" id="paymentResult" data-result={result} role="status">
      <h2 style={{ fontSize: 18, display: 'flex', gap: 8, alignItems: 'center' }}><Icon name={n.icon} />{n.title}</h2>
      <p className="muted">{n.body}</p>
      {result === 'waiting' && sessionId && <div className="row"><Link className="btn btn-quiet btn-sm" href={'/billing/return?sessionId=' + encodeURIComponent(sessionId)} prefetch={false}>Check again</Link></div>}
    </section>
  );
}
