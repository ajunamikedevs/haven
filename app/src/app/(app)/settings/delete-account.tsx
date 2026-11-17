'use client';

import { useState, useTransition } from 'react';
import { Sheet } from '@/components/sheet';
import { deleteAccount } from './account-actions';

export function DeleteAccount({ email, paying }: { email: string; paying: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn btn-quiet btn-sm" type="button" onClick={() => { setError(''); setOpen(true); }}>Delete account</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Delete your account?" titleId="deleteTitle" id="deleteDialog" plain>
        <form className="sheet-body" onSubmit={(e) => {
          e.preventDefault();
          const typed = String(new FormData(e.currentTarget).get('confirmEmail') ?? '');
          start(async () => { const r = await deleteAccount(typed); if (r && !r.ok) setError(r.message); });
        }}>
          <p className="muted">This removes your household, its week, meals, lists and shared links for good. It can’t be undone. {paying ? 'Your subscription will be cancelled first so you’re not charged again.' : ''} You may want to export your data first.</p>
          <div className="field">
            <label htmlFor="confirmEmail">Type <strong>{email}</strong> to confirm</label>
            <input className="input" id="confirmEmail" name="confirmEmail" type="email" autoComplete="off" required aria-describedby={error ? 'deleteError' : undefined} />
            {error && <p className="field-error" id="deleteError" role="alert">{error}</p>}
          </div>
          <div className="sheet-foot">
            <button className="btn btn-quiet" type="button" onClick={() => setOpen(false)}>Keep my account</button>
            <button className="btn btn-danger" type="submit" disabled={pending}>{pending ? 'Deleting…' : 'Delete everything'}</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
