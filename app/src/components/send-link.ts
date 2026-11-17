'use client';

import { shareLink } from '@/app/(app)/actions';
import { copyText } from './confirm-sheet';

/**
 * Gets the household's link for its list or week and hands it to the phone's share sheet,
 * or copies it where there isn't one. Returns the message to show, or null if the share
 * sheet took over.
 */
export async function sendLink(kind: 'list' | 'week'): Promise<string | null> {
  const result = await shareLink(kind);
  if (!result.ok) return result.message;
  const url = location.origin + result.path;
  const what = kind === 'list' ? 'the list' : 'the week';
  if (navigator.share) {
    try {
      await navigator.share({ title: (kind === 'list' ? 'Grocery list' : 'Our week') + ' · Haven', url });
      return null;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return null; // they closed the share sheet
    }
  }
  return (await copyText(url))
    ? `Link copied. Anyone with it can open ${what}, no app needed.`
    : `Copying is blocked here. The link is: ${url}`;
}
