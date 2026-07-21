import type { Prisma } from '@prisma/client';

export function buildEventWhereClause(filters: {
  search?: string;
  date?: string;
  upcoming?: boolean;
}): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    status: 'PUBLISHED',
  };

  if (filters.upcoming !== false) {
    where.startAt = { gte: new Date() };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
      { venueName: { contains: filters.search } },
    ];
  }

  if (filters.date) {
    const dateObj = new Date(filters.date);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    where.startAt = { gte: dateObj, lt: nextDay };
  }

  return where;
}

export function parseInstruments(_instruments: string): string[] {
  return [];
}

export function formatTime(time: string): string {
  return time;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export const SKILL_LABELS: Record<string, string> = {};
