import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/events', label: 'Events' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-xl">🎵</span>
              Jamming
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Austin&apos;s community for live music jamming sessions. Discover, book, and play.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white">Navigate</h3>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.slice(0, 3).map((link) => (
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
              {FOOTER_LINKS.slice(3).map((link) => (
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

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-white">Community</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#" className="text-sm text-text-secondary transition-colors hover:text-white">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-secondary transition-colors hover:text-white">
                  Instagram
                </a>
              </li>
              <li>
                <span className="text-sm text-text-muted">hello@jamming.events</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} Jamming. Made for musicians.
        </div>
      </div>
    </footer>
  );
}
