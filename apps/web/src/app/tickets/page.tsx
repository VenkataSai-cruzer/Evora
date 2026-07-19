import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatTime } from '@/lib/prisma-types';

export const metadata: Metadata = {
  title: 'My Tickets',
  description: 'View your upcoming and past event tickets.',
};

const TICKET_STATUS_STYLES: Record<string, { variant: 'success' | 'warning' | 'error' | 'default' | 'primary' | 'outline'; label: string }> = {
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  CHECKED_IN: { variant: 'primary', label: 'Used' },
  CANCELLED: { variant: 'error', label: 'Cancelled' },
  EXPIRED: { variant: 'default', label: 'Expired' },
};

export default async function MyTicketsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/tickets');
  }

  const userId = session.user.id;

  const [upcomingTickets, pastTickets, orders] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        userId,
        event: { startDate: { gte: new Date() } },
        status: { in: ['CONFIRMED'] },
      },
      orderBy: { event: { startDate: 'asc' } },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        type: true,
        category: true,
        purchasedAt: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            startTime: true,
            endDate: true,
            endTime: true,
            venueName: true,
            venueAddress: true,
            coverImageUrl: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            bookingType: true,
            attendeeCount: true,
          },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        userId,
        OR: [
          { event: { startDate: { lt: new Date() } } },
          { status: { in: ['CHECKED_IN', 'CANCELLED', 'EXPIRED'] } },
        ],
      },
      orderBy: { event: { startDate: 'desc' } },
      take: 20,
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            startTime: true,
            venueName: true,
          },
        },
        order: {
          select: {
            bookingType: true,
            attendeeCount: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        bookingType: true,
        attendeeCount: true,
        status: true,
        createdAt: true,
        event: {
          select: {
            title: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  const hasNoData = upcomingTickets.length === 0 && pastTickets.length === 0;

  if (hasNoData) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon="🎫"
          title="No tickets yet"
          description="Browse upcoming events and grab your first ticket!"
          actionHref={{ label: 'Browse events', href: '/events' }}
        />
      </div>
    );
  }

  return (
    <div className="page-container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Tickets</h1>
        <p className="mt-1 text-text-secondary">
          {upcomingTickets.length > 0
            ? `${upcomingTickets.length} upcoming ${upcomingTickets.length === 1 ? 'event' : 'events'}`
            : 'No upcoming events'}
        </p>
      </div>

      {/* Upcoming */}
      {upcomingTickets.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming</h2>
          <div className="space-y-4">
            {upcomingTickets.map((ticket) => {
              const statusStyle = TICKET_STATUS_STYLES[ticket.status] || { variant: 'default' as const, label: ticket.status };

              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.ticketNumber}`}
                  className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-surface p-4 transition-all hover:bg-surface-hover"
                >
                  {/* Event cover thumbnail */}
                  <div className="hidden h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-elevated sm:block">
                    {ticket.event.coverImageUrl ? (
                      <img src={ticket.event.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl opacity-30">🎵</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{ticket.event.title}</h3>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {formatDate(ticket.event.startDate)} &bull; {formatTime(ticket.event.startTime)}
                        </p>
                        <p className="text-xs text-text-muted">{ticket.event.venueName}</p>
                      </div>
                      <Badge variant={statusStyle.variant} size="sm">{statusStyle.label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                      <span>Ticket: {ticket.ticketNumber}</span>
                      {ticket.order && (
                        <span>{ticket.order.bookingType} booking</span>
                      )}
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
                      View pass
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Past tickets */}
      {pastTickets.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Past</h2>
          <div className="space-y-2">
            {pastTickets.map((ticket) => {
              const statusStyle = TICKET_STATUS_STYLES[ticket.status] || { variant: 'default' as const, label: ticket.status };
              return (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{ticket.event.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(ticket.event.startDate)} &bull; {ticket.event.venueName}
                    </p>
                  </div>
                  <Badge variant={statusStyle.variant} size="sm">{statusStyle.label}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Orders</h2>
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-surface p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{order.event.title}</p>
                  <p className="text-xs text-text-muted">
                    {order.orderNumber} &bull; {order.bookingType} &bull; {order.attendeeCount} {order.attendeeCount === 1 ? 'attendee' : 'attendees'}
                  </p>
                </div>
                <Badge variant="outline" size="sm">{order.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
