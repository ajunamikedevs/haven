import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { IconSprite } from '@/components/icon-sprite';
import { RegisterServiceWorker } from './pwa';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-jakarta', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Haven', template: '%s · Haven' },
  applicationName: 'Haven',
  appleWebApp: { capable: true, title: 'Haven', statusBarStyle: 'default' },
  icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
  description: 'Haven notices the open nights, the late shifts and the missing groceries before you do, so the week runs without anyone keeping score.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF9F7' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1B19' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${jakarta.variable} ${inter.variable}`}>
      <body>
        <IconSprite />
        {children}
        <RegisterServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
