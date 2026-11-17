'use client';

import { useState, useTransition } from 'react';
import { ConfirmSheet, type Confirm } from '@/components/confirm-sheet';
import { useToast } from '@/components/toast';
import { cancelSubscription } from './actions';

export function CancelButton({ endsOn }: { endsOn: string }) {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <button className="btn btn-quiet btn-sm" type="button" disabled={pending} onClick={() => setConfirm({
        title: 'Stop renewing?',
        body: `You keep Haven until ${endsOn}, and you won’t be charged again. After that, everything you planned stays there to read.`,
        label: 'Stop renewing',
        run: () => start(async () => { const r = await cancelSubscription(); toast(r.message); }),
      })}>Cancel plan</button>
      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
