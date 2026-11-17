import { confirmCheckout } from '@/lib/billing';
import { requireHousehold } from '@/lib/dal';

// Where AgentaOS sends the organizer after paying. Landing here proves nothing by itself: the
// session is looked up with AgentaOS first, then the plan page is shown fresh with the outcome.
export async function GET(req: Request) {
  const { household } = await requireHousehold();
  const sessionId = new URL(req.url).searchParams.get('sessionId') ?? '';
  const result = sessionId && sessionId.length < 200 ? await confirmCheckout(household.id, sessionId) : 'unknown';
  const to = new URL('/billing', req.url);
  to.searchParams.set('payment', result);
  if (result === 'waiting') to.searchParams.set('sessionId', sessionId);
  return Response.redirect(to, 303);
}
