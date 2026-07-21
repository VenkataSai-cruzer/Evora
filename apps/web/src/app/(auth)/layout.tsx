import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal brand header — no login/register buttons, no public nav */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-white transition-opacity hover:opacity-80"
          >
            ✦ 7 NOTES
          </Link>
        </div>
      </header>
      <main className="flex-1 pt-16">{children}</main>
    </div>
  );
}
