import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins/magic-link';
import { db } from '@/db';
import { account, rateLimit, session, user, verification } from '@/db/schema';
import { magicLinkEmail, sendEmail } from './email';

// Google sign-in turns on by itself once the owner adds the OAuth client to the environment.
export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification, rateLimit } }),
  socialProviders: googleEnabled
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},
  // Limits per IP address, shared across server instances. Off in development and tests.
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/magic-link': { window: 600, max: 5 }, // five sign-in emails per 10 minutes
      '/magic-link/verify': { window: 60, max: 10 },
      '/sign-in/social': { window: 60, max: 10 },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, ...magicLinkEmail(url) });
      },
    }),
    nextCookies(), // must stay last: lets server actions set the session cookie
  ],
});
