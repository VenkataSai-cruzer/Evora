import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No events found" />);
    expect(screen.getByText('No events found')).toBeDefined();
  });

  it('renders description', () => {
    render(
      <EmptyState title="Empty" description="There is nothing here yet." />,
    );
    expect(screen.getByText('There is nothing here yet.')).toBeDefined();
  });

  it('renders action button with label', () => {
    render(
      <EmptyState
        title="No tickets"
        action={{ label: 'Browse events', onClick: () => {} }}
      />,
    );
    expect(screen.getByText('Browse events')).toBeDefined();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon="🎵" />);
    expect(screen.getByText('🎵')).toBeDefined();
  });
});
