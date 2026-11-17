'use client';

import { useSyncExternalStore } from 'react';

const zones: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
const subscribe = () => () => {};

/** Time zone picker, pre-filled from the browser once it has loaded. */
export function TimeZoneField() {
  // The server can't know the visitor's zone, so it renders UTC and the browser corrects it
  const detected = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => 'UTC');
  const options = zones.includes(detected) ? zones : [detected, ...zones];
  return (
    <div className="field">
      <label htmlFor="timeZone">Your time zone</label>
      <select className="input" id="timeZone" name="timeZone" defaultValue={detected} key={detected}>
        {options.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
      </select>
    </div>
  );
}
