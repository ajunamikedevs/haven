import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { googleEnabled } from '@/lib/auth';
import { SignInForm } from './signin-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link className="brand" href="/" aria-label="Haven home">
        <span className="brand-mark"><Icon name="home" /></span>Haven
      </Link>
      <section className="card auth-card" aria-labelledby="signinTitle">
        <h1 id="signinTitle">Sign in or start your free trial</h1>
        <p className="muted">14 days free, no card needed. We’ll email you a link, so there’s no password to remember.</p>
        <SignInForm googleEnabled={googleEnabled} />
      </section>
      <p className="hint">Only the person who plans the week needs an account. Everyone else just gets a link.</p>
    </main>
  );
}
