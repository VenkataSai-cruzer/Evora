import type { Prisma } from '@prisma/client';

export function buildEventWhereClause(filters: {
  search?: string;
  skillLevel?: string;
  instrument?: string;
  date?: string;
  upcoming?: boolean;
}): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    status: { in: ['PUBLISHED', 'SALES_OPEN'] },
    visibility: 'PUBLIC',
  };

  if (filters.upcoming !== false) {
    where.startDate = { gte: new Date() };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
      { venueName: { contains: filters.search } },
    ];
  }

  if (filters.skillLevel) {
    // 'ALL' matches events welcoming all skill levels
    where.skillLevel = filters.skillLevel === 'ALL'
      ? { in: ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }
      : filters.skillLevel;
  }

  if (filters.instrument) {
    where.instruments = { contains: filters.instrument };
  }

  if (filters.date) {
    const dateObj = new Date(filters.date);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    where.startDate = { gte: dateObj, lt: nextDay };
  }

  return where;
}

export function parseInstruments(instruments: string): string[] {
  try {
    return JSON.parse(instruments);
  } catch {
    return [];
  }
}

export function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
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

export const SKILL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  ALL: 'All Levels',
};
