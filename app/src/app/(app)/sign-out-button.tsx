'use client';

import { clearSavedPages } from '@/app/pwa';
import { signOut } from './sign-out-action';

/** A plain form, so signing out works even before the page's scripts have loaded. */
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={clearSavedPages}>
      <button className="btn btn-text btn-sm" type="submit">Sign out</button>
    </form>
  );
}
