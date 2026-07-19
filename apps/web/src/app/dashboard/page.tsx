import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDate } from '@/lib/prisma-types';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login?callbackUrl=/dashboard');

  const userId = session.user.id;

  const [
    totalEvents,
    draftEvents,
    activeEvents,
    completedEvents,
    cancelledEvents,
    recentEvents,
    totalOrders,
    contactMessages,
  ] = await Promise.all([
    prisma.event.count({ where: { organizerId: userId } }),
    prisma.event.count({ where: { organizerId: userId, status: 'DRAFT' } }),
    prisma.event.count({ where: { organizerId: userId, status: 'PUBLISHED' } }),
    prisma.event.count({ where: { organizerId: userId, status: 'COMPLETED' } }),
    prisma.event.count({ where: { organizerId: userId, status: 'CANCELLED' } }),
    prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        startDate: true,
        ticketType: true,
        _count: { select: { tickets: true } },
      },
    }),
    prisma.order.count({
      where: { event: { organizerId: userId } },
    }),
    prisma.contactMessage.count({
      where: { read: false },
    }),
  ]);

  const stats = [
    { label: 'Total Events', value: totalEvents, color: 'text-white' },
    { label: 'Published', value: activeEvents, color: 'text-success' },
    { label: 'Drafts', value: draftEvents, color: 'text-warning' },
    { label: 'Completed', value: completedEvents, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--color-border)] bg-surface p-5"
          >
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="mt-1 text-xs text-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover"
        >
          <span>➕</span>
          Create Event
        </Link>
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
        >
          <span>📋</span>
          Manage Events
        </Link>
        {contactMessages > 0 && (
          <Link
            href="/dashboard/contact-requests"
            className="inline-flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm font-medium text-warning transition-all"
          >
            <span>📧</span>
            {contactMessages} unread messages
          </Link>
        )}
      </div>

      {/* Recent Events */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Events</h2>
          <Link
            href="/dashboard/events"
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            View all
          </Link>
        </div>

        {recentEvents.length > 0 ? (
          <div className="mt-4 space-y-2">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎵</span>
                  <div>
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(event.startDate)} &bull; {event._count.tickets} tickets
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  event.status === 'PUBLISHED' || event.status === 'SALES_OPEN' ? 'bg-success/10 text-success' :
                  event.status === 'DRAFT' ? 'bg-warning/10 text-warning' :
                  event.status === 'COMPLETED' ? 'bg-primary/10 text-primary' :
                  event.status === 'SALES_PAUSED' ? 'bg-warning/10 text-warning' :
                  'bg-error/10 text-error'
                }`}>
                  {event.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">No events yet. Create your first event!</p>
          </div>
        )}
      </section>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="flex items-center gap-2">
            <span>🎫</span>
            <span className="text-sm font-medium text-white">Total Orders</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{totalOrders}</div>
          <p className="mt-1 text-xs text-text-muted">Across all events</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-5">
          <div className="flex items-center gap-2">
            <span>📊</span>
            <span className="text-sm font-medium text-white">Cancelled Events</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{cancelledEvents}</div>
          <p className="mt-1 text-xs text-text-muted">{cancelledEvents > 0 ? `${((cancelledEvents / (totalEvents || 1)) * 100).toFixed(0)}% cancellation rate` : 'No cancellations'}</p>
        </div>
      </div>
    </div>
  );
}
