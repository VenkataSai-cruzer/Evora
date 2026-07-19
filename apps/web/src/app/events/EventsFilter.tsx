'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';

interface EventsFilterProps {
  currentSearch: string;
  currentInstrument: string;
  currentSkill: string;
  currentSort: string;
  instruments: string[];
  skillLabels: Record<string, string>;
}

export function EventsFilter({
  currentSearch,
  currentInstrument,
  currentSkill,
  currentSort,
  instruments,
  skillLabels,
}: EventsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const search = overrides.search ?? currentSearch;
      const instrument = overrides.instrument ?? currentInstrument;
      const skill = overrides.skill ?? currentSkill;
      const sort = overrides.sort ?? currentSort;

      if (search) params.set('search', search);
      if (instrument) params.set('instrument', instrument);
      if (skill) params.set('skillLevel', skill);
      if (sort && sort !== 'date') params.set('sort', sort);

      const qs = params.toString();
      return `${pathname}${qs ? `?${qs}` : ''}`;
    },
    [pathname, currentSearch, currentInstrument, currentSkill, currentSort],
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ search: searchValue }));
  }

  function handleClear() {
    setSearchValue('');
    router.push(pathname);
  }

  const hasFilters = currentSearch || currentInstrument || currentSkill || currentSort !== 'date';

  return (
    <div className="mb-8 space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-md">
        <input
          type="search"
          placeholder="Search events..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-surface py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-muted transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </form>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Instruments */}
        <select
          value={currentInstrument}
          onChange={(e) => router.push(buildUrl({ instrument: e.target.value }))}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:text-white focus:border-primary focus:outline-none"
        >
          <option value="">All Instruments</option>
          {instruments.map((inst) => (
            <option key={inst} value={inst}>
              {inst}
            </option>
          ))}
        </select>

        {/* Skill level */}
        <select
          value={currentSkill}
          onChange={(e) => router.push(buildUrl({ skill: e.target.value }))}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:text-white focus:border-primary focus:outline-none"
        >
          <option value="">All Levels</option>
          {Object.entries(skillLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={currentSort}
          onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
          className="rounded-lg border border-[var(--color-border)] bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/30 hover:text-white focus:border-primary focus:outline-none"
        >
          <option value="date">Sort: Date</option>
          <option value="title">Sort: Title</option>
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={handleClear}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
