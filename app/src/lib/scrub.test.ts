import { describe, expect, it } from 'vitest';
import { scrubText } from './scrub';

describe('error log scrubbing', () => {
  it('removes emails and tokens', () => {
    expect(scrubText('No household for ana@example.com')).toBe('No household for [email]');
    expect(scrubText('/s/0123456789abcdef0123456789abcdefAbCdEfGhIjKlMnOpQrStUvWxYz0123456')).toBe('/s/[token]');
    expect(scrubText('/billing/return?sessionId=cs_123&x=1')).toBe('/billing/return?sessionId=[redacted]&x=1');
  });
});
