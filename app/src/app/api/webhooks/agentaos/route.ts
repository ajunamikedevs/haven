import { WebhookVerificationError } from '@agentaos/pay';
import { handleWebhook } from '@/lib/billing';
import { verifyWebhook } from '@/lib/billing/gateway';

// AgentaOS calls this for checkouts, renewals, failed payments, cancellations and disputes.
// The signature is checked against the raw body before anything is read from it.
export async function POST(req: Request) {
  const raw = await req.text();
  let event;
  try {
    event = verifyWebhook(raw, req.headers.get('x-agentaos-signature'));
  } catch (e) {
    if (e instanceof WebhookVerificationError) return Response.json({ error: 'invalid signature' }, { status: 400 });
    throw e;
  }
  const handled = await handleWebhook(event, raw);
  return Response.json({ received: true, duplicate: !handled });
}
