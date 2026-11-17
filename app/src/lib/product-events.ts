import 'server-only';
import { db } from '@/db';
import { productEvents } from '@/db/schema';

/** The product events behind the beta metrics. Names only: never any household content. */
export type ProductEvent =
  | 'signup' | 'week_planned' | 'fill_open_nights' | 'share_link_created' | 'share_link_opened'
  | 'wrap_up_completed' | 'trial_converted' | 'imported_prototype_week';

/** Records that something happened. Analytics must never break the feature, so failures are swallowed. */
export async function recordEvent(householdId: string, name: ProductEvent): Promise<void> {
  try {
    await db.insert(productEvents).values({ householdId, name });
  } catch (e) {
    console.error('product event not recorded', name, e instanceof Error ? e.message : e);
  }
}
