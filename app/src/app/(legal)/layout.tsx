import Link from 'next/link';
import { Icon } from '@/components/icon';
import { LegalFooter } from '@/components/legal-footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <header className="app-top">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Haven home"><span className="brand-mark"><Icon name="home" /></span>Haven</Link>
        </div>
      </header>
      <main className="wrap view">
        <article className="narrow legal">
          <p className="note" role="note"><Icon name="pencil" size="sm" /><span><strong>Draft for review.</strong> This page is a plain-language draft and has not yet been reviewed by a lawyer. It is not legal advice.</span></p>
          {children}
        </article>
      </main>
      <LegalFooter />
    </div>
  );
}
