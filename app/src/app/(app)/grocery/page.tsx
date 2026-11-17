import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadWeek, requireHousehold } from '@/lib/dal';
import { GroceryClient } from './grocery-client';

export const metadata: Metadata = { title: 'Grocery list' };

export default function GroceryPage() {
  return (
    <Suspense fallback={<p className="muted" aria-busy="true">Loading your list…</p>}>
      <GroceryData />
    </Suspense>
  );
}

async function GroceryData() {
  const { household } = await requireHousehold();
  return <GroceryClient week={await loadWeek(household.id)} weekOf={household.weekOf} />;
}
