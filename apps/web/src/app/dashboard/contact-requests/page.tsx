import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface ContactRequestsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ContactRequestsPage({ searchParams }: ContactRequestsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login?callbackUrl=/dashboard/contact-requests');
  if (session.user.role !== 'ADMIN') redirect('/');

  const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : '';
  const search = typeof searchParams.q === 'string' ? searchParams.q : '';

  const where: Record<string, unknown> = {};
  if (statusFilter === 'read') where.isRead = true;
  if (statusFilter === 'unread') where.isRead = false;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { subject: { contains: search } },
    ];
  }

  const messages = await prisma.contactMessage.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const total = await prisma.contactMessage.count();
  const unread = await prisma.contactMessage.count({ where: { isRead: false } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contact Requests</h1>
          <p className="mt-1 text-sm text-gray-400">{total} total, {unread} unread</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search..."
          defaultValue={search}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-64"
          onChange={(e) => {
            const params = new URLSearchParams();
            if (e.target.value) params.set('q', e.target.value);
            if (statusFilter) params.set('status', statusFilter);
            window.location.href = `/dashboard/contact-requests?${params.toString()}`;
          }}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          defaultValue={statusFilter}
          onChange={(e) => {
            const params = new URLSearchParams();
            if (e.target.value) params.set('status', e.target.value);
            if (search) params.set('q', search);
            window.location.href = `/dashboard/contact-requests?${params.toString()}`;
          }}
        >
          <option value="">All Status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <EmptyState icon="📬" title="No messages found" description={search || statusFilter ? 'Try different filters.' : 'No contact requests yet.'} />
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4 transition-colors hover:bg-gray-800/50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!msg.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                    <h3 className="text-sm font-medium text-white truncate">{msg.subject}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">{msg.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{msg.name}</span>
                    <span>•</span>
                    <span>{msg.email}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
