'use client';

import { copyText } from '@/components/confirm-sheet';
import { Icon } from '@/components/icon';
import { useAct, useToast } from '@/components/toast';
import { revokeShareLink, setTimeZone } from '../actions';

const zones: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

type LinkRow = { id: string; kind: 'list' | 'week'; path: string; lastOpened: string | null };

export function SettingsClient({ timeZone, links }: { timeZone: string; links: LinkRow[] }) {
  const { act, pending } = useAct();
  const toast = useToast();
  const options = zones.includes(timeZone) ? zones : [timeZone, ...zones];

  return (
    <>
      <form className="card h-section add-person" onSubmit={(e) => { e.preventDefault(); act(() => setTimeZone(String(new FormData(e.currentTarget).get('timeZone')))); }}>
        <h2>Time zone</h2>
        <div className="field">
          <label htmlFor="timeZone">Your household’s time zone</label>
          <select className="input" id="timeZone" name="timeZone" defaultValue={timeZone}>
            {options.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
          <p className="hint">Haven uses this to know what “today” and “tonight” mean, and when a new week starts.</p>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>Save time zone</button>
      </form>

      <section className="card h-section" aria-labelledby="linksTitle">
        <h2 id="linksTitle">Shared links</h2>
        <p className="muted" style={{ fontSize: 14, paddingBottom: 8 }}>Anyone with a link can open it without an account. A grocery list link also lets them tick things off. Switch a link off to stop it working.</p>
        {links.length ? (
          <ul className="members">
            {links.map((l) => (
              <li className="link-row" key={l.id}>
                <span className="feature-icon"><Icon name={l.kind === 'list' ? 'bag' : 'cal'} /></span>
                <div className="link-text">
                  <strong>{l.kind === 'list' ? 'Grocery list' : 'This week'}</strong>
                  <span className="hint">{l.lastOpened ? `Last opened ${l.lastOpened}` : 'Not opened yet'}</span>
                </div>
                <button className="btn btn-quiet btn-sm" type="button" onClick={async () => toast((await copyText(location.origin + l.path)) ? 'Link copied.' : 'Copying is blocked here.')}>Copy</button>
                <button className="btn btn-danger btn-sm" type="button" disabled={pending} onClick={() => act(() => revokeShareLink(l.id))} aria-label={`Switch off the ${l.kind === 'list' ? 'grocery list' : 'week'} link`}>Switch off</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ paddingBlock: 8 }}>No links yet. Use “Send list link” on the grocery list or the share button on This Week.</p>
        )}
      </section>
    </>
  );
}
