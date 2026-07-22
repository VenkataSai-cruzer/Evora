'use client';

import { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface VerificationFiltersProps {
  statusOptions: FilterOption[];
  activeStatus: string;
  onStatusChange: (_status: string) => void;
  onSearch?: (_query: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function VerificationFilters({
  statusOptions,
  activeStatus,
  onStatusChange,
  onSearch,
  onRefresh,
  loading,
}: VerificationFiltersProps) {
  const [searchValue, setSearchValue] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(searchValue.trim());
  }

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            disabled={loading}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              activeStatus === opt.value
                ? 'bg-primary text-white'
                : 'bg-surface-elevated text-text-secondary hover:text-white hover:bg-surface-hover'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0 text-2xs ${
                activeStatus === opt.value ? 'bg-white/20' : 'bg-surface/50'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-2">
        {onSearch && (
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search orders, UTR, name..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-surface-elevated py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex-shrink-0 rounded-lg border border-[var(--color-border)] bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>
      </div>
    </div>
  );
}
