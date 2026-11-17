import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { gateway, readLocalStore } from '@/lib/billing/gateway';
import { PRICES } from '@/lib/billing/rules';

export const metadata: Metadata = { title: 'Test checkout', robots: { index: false, follow: false } };

// Stands in for AgentaOS's hosted checkout when no AGENTAOS_API_KEY is set (development and
// tests). Never reachable in production, and never when the real gateway is configured.
export default function DevCheckoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return <Suspense fallback={null}><DevCheckout params={params} /></Suspense>;
}

async function DevCheckout({ params }: { params: Promise<{ sessionId: string }> }) {
  if (process.env.NODE_ENV === 'production' || gateway().kind !== 'local') notFound();
  const { sessionId } = await params;
  const checkout = (await readLocalStore()).checkouts[sessionId];
  if (!checkout) notFound();
  const price = checkout.linkId.endsWith('annual') ? PRICES.annual : PRICES.monthly;

  return (
    <main className="wrap view">
      <div className="narrow">
        <div className="card" style={{ padding: 24 }}>
          <span className="eyebrow">Test checkout · no real money</span>
          <h1 style={{ fontSize: 24 }}>Haven, ${price.amount} a {price.per}</h1>
          <p className="muted">This page stands in for AgentaOS’s checkout while billing isn’t connected.</p>
          <form method="post" action={`/dev/checkout/${sessionId}/pay`}><button className="btn btn-primary" type="submit">Pay ${price.amount} (test)</button></form>
        </div>
      </div>
    </main>
  );
}
