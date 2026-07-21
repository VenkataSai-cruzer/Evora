import { AuthGuard } from '@/components/AuthGuard';
import { UserNav } from './UserNav';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <UserNav />
        <main className="flex-1 pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
