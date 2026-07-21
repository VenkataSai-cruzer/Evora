import Link from 'next/link';
import { FOOTER_NAV } from '@/lib/navigation';

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white">
              ✦ 7 NOTES
            </Link>
            <p className="mt-3 text-sm text-text-muted">
              Live music, real connections.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Navigate</h3>
            <ul className="mt-3 space-y-2">
              {FOOTER_NAV.slice(0, 3).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-secondary hover:text-white">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-3 space-y-2">
              {FOOTER_NAV.slice(3).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-secondary hover:text-white">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Connect</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-text-muted">hello@7notes.in</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} 7 NOTES
        </div>
      </div>
    </footer>
  );
}
