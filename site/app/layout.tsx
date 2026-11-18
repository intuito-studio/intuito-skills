import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { REPO } from '@/lib/skills';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

// Netlify sets URL at build time. Set SITE_URL to override it.
const siteUrl = process.env.SITE_URL ?? process.env.URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Intuito Skills', template: '%s · Intuito Skills' },
  description: 'Agent skills written and used by Intuito Studio. Install them in Claude Code, Codex, Cursor and other agents with one command.',
  // A page that sets its own openGraph replaces this one, so it must set images too.
  openGraph: { siteName: 'Intuito Skills', type: 'website', images: [{ url: '/og/home.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/home.png'] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#f7f5ef' },
  ],
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
    <body>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="wrap">
          <Link className="brand" href="/">
            Intuito <span>Skills</span>
          </Link>
          <nav aria-label="Site">
            <Link href="/">All skills</Link>
            <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="foot">
        <div className="wrap">
          <span className="eyebrow">
            Made by <a href="https://intuitostudio.com">Intuito Studio</a> · MIT licence
          </span>
        </div>
      </footer>
    </body>
  </html>
);

export default RootLayout;
