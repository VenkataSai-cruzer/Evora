'use client';

interface VerificationStatsProps {
  pendingCount: number;
  pendingVerificationCount?: number;
  approvedCount: number;
  rejectedCount: number;
  totalCount: number;
  loading?: boolean;
}

export function VerificationStats({
  pendingCount,
  pendingVerificationCount = 0,
  approvedCount,
  rejectedCount,
  loading,
}: VerificationStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-elevated" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Awaiting Payment',
      count: pendingCount,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      icon: '📋',
    },
    {
      label: 'Pending Verification',
      count: pendingVerificationCount,
      color: 'text-warning bg-warning/10 border-warning/20',
      icon: '⏳',
    },
    {
      label: 'Approved',
      count: approvedCount,
      color: 'text-success bg-success/10 border-success/20',
      icon: '✓',
    },
    {
      label: 'Rejected',
      count: rejectedCount,
      color: 'text-error bg-error/10 border-error/20',
      icon: '✗',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-lg border ${stat.color} p-3`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{stat.label}</span>
            <span className="text-lg">{stat.icon}</span>
          </div>
          <p className="mt-1 text-xl font-bold">{stat.count}</p>
        </div>
      ))}
    </div>
  );
}
