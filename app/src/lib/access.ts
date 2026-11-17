// The one place that decides whether a household can edit. Every write action and the
// read-only banner go through getAccess(); nothing else looks at trial or subscription state.

export const TRIAL_DAYS = 14;

/** AgentaOS subscription statuses. */
export type SubscriptionStatus = 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';

export type SubscriptionState = {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type Access =
  | { level: 'full'; reason: 'trial'; trialDaysLeft: number }
  | { level: 'full'; reason: 'subscribed'; endsOn: Date | null } // endsOn is set when a cancel is scheduled
  | { level: 'full'; reason: 'payment_retrying' } // a renewal failed and the card is being retried
  | { level: 'full'; reason: 'paid_until'; endsOn: Date } // cancelled, but the paid period hasn't ended
  | { level: 'read_only'; reason: 'trial_ended' | 'subscription_ended' };

export function trialEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + TRIAL_DAYS * 86_400_000);
}

export function getAccess(input: { trialEndsAt: Date; subscription: SubscriptionState | null; now?: Date }): Access {
  const now = input.now ?? new Date();
  const sub = input.subscription;

  if (sub) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      return { level: 'full', reason: 'subscribed', endsOn: sub.cancelAtPeriodEnd ? sub.currentPeriodEnd : null };
    }
    if (sub.status === 'past_due') return { level: 'full', reason: 'payment_retrying' };
    if (sub.status === 'canceled' && sub.currentPeriodEnd && now < sub.currentPeriodEnd) {
      return { level: 'full', reason: 'paid_until', endsOn: sub.currentPeriodEnd };
    }
  }

  if (now < input.trialEndsAt) {
    return { level: 'full', reason: 'trial', trialDaysLeft: Math.max(1, Math.ceil((input.trialEndsAt.getTime() - now.getTime()) / 86_400_000)) };
  }

  // A subscription that existed and no longer grants access reads differently from a trial that just ran out
  const hadPaid = !!sub && sub.status !== 'incomplete' && sub.status !== 'incomplete_expired';
  return { level: 'read_only', reason: hadPaid ? 'subscription_ended' : 'trial_ended' };
}

export const canWrite = (access: Access) => access.level === 'full';
