import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Free</Badge>);
    expect(screen.getByText('Free')).toBeDefined();
  });

  it('renders with primary variant', () => {
    render(<Badge variant="primary">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('text-primary');
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">Completed</Badge>);
    const badge = screen.getByText('Completed');
    expect(badge.className).toContain('text-success');
  });
});
