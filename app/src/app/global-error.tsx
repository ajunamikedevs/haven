'use client';


/** Last-resort screen when the whole app fails to render. Server errors are in Vercel's logs. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, color: '#2C2A28', background: '#FBF9F7' }}>
        <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
        <p>Haven hit a problem loading this page. Your plan is safe.</p>
        <button type="button" onClick={reset} style={{ padding: '10px 16px', borderRadius: 12, border: 0, background: '#A65D40', color: '#fff', fontWeight: 600 }}>Try again</button>
      </body>
    </html>
  );
}
