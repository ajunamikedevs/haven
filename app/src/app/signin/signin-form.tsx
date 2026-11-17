'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { authClient } from '@/lib/auth-client';

type State = { step: 'form' } | { step: 'sending' } | { step: 'sent'; email: string } | { step: 'error'; message: string };

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, setState] = useState<State>({ step: 'form' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!email) return;
    setState({ step: 'sending' });
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: '/week', newUserCallbackURL: '/welcome' });
    setState(error ? { step: 'error', message: 'We couldn’t send the link. Check the address and try again.' } : { step: 'sent', email });
  }

  if (state.step === 'sent') {
    return (
      <div className="auth-sent" role="status">
        <span className="pot"><Icon name="check" size="lg" /></span>
        <p><strong>Check your email.</strong> We sent a sign-in link to {state.email}. It works once and expires in 10 minutes.</p>
        <button className="btn btn-text" type="button" onClick={() => setState({ step: 'form' })}>Use a different address</button>
      </div>
    );
  }

  const busy = state.step === 'sending';
  return (
    <>
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@example.com" aria-describedby={state.step === 'error' ? 'signinError' : undefined} />
          {state.step === 'error' && <p className="field-error" id="signinError" role="alert">{state.message}</p>}
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
      {googleEnabled && (
        <>
          <p className="auth-or"><span>or</span></p>
          <button className="btn btn-quiet btn-block" type="button" onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/week', newUserCallbackURL: '/welcome' })}>
            Continue with Google
          </button>
        </>
      )}
    </>
  );
}
