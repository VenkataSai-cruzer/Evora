import Link from 'next/link';
import { FOOTER_NAV } from '@/lib/navigation';

export function Footer() {
  const mainLinks = FOOTER_NAV.slice(0, 3);
  const legalLinks = FOOTER_NAV.slice(3);

  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-xl">✦</span>
              7 NOTES
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Official event platform for 7 NOTES. Live music, real connections.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white">Navigate</h3>
            <ul className="mt-3 space-y-2">
              {mainLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-white">Connect</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="text-sm text-text-secondary transition-colors hover:text-white">
                  Instagram
                </a>
              </li>
              <li>
                <span className="text-sm text-text-muted">hello@7notes.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} 7 NOTES. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
