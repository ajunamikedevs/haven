import Link from 'next/link';

/** Footer links to the legal pages, used on the landing page and the legal pages themselves. */
export function LegalFooter() {
  return (
    <footer className="wrap l-foot">
      <span>Haven · household scheduling and meal planning</span>
      <nav aria-label="Legal" className="legal-links">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refunds">Refunds</Link>
      </nav>
    </footer>
  );
}
