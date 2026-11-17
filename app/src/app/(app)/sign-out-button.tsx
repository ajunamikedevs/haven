import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

async function signOut() {
  'use server';
  await auth.api.signOut({ headers: await headers() });
  redirect('/');
}

/** A plain form, so signing out works even before the page's scripts have loaded. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn btn-text btn-sm" type="submit">Sign out</button>
    </form>
  );
}
