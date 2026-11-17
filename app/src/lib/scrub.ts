// Error logs must never carry who someone is or what their household planned.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Share-link tokens (32 hex + signature) and sign-in or checkout tokens in URLs
const TOKENS = /(\/s\/)[0-9a-f]{32}[\w-]{20,}|([?&](token|sessionId|callbackURL)=)[^&#\s]+/gi;

export const scrubText = (s: string) => s.replace(EMAIL, '[email]').replace(TOKENS, (_m, a, b) => (a ? `${a}[token]` : `${b}[redacted]`));
