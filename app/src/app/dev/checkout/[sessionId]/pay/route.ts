import { notFound } from 'next/navigation';
import { completeLocalCheckout, gateway } from '@/lib/billing/gateway';

// "Pay" on the stand-in checkout. A plain form post and a 303, so the browser makes a full
// navigation back to Haven exactly as it does when returning from AgentaOS.
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (process.env.NODE_ENV === 'production' || gateway().kind !== 'local') notFound();
  const { sessionId } = await params;
  return Response.redirect(await completeLocalCheckout(sessionId), 303);
}
