import Link from 'next/link';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionHref?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon, title, description, action, actionHref }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center" role="status">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
          <span className="text-2xl">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
      {actionHref && (
        <div className="mt-6">
          <Link
            href={actionHref.href}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary-hover"
          >
            {actionHref.label}
          </Link>
        </div>
      )}
    </div>
  );
}
