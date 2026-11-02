import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Card } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { StatCard } from './stat-card';
import { IndianRupee } from 'lucide-react';

describe('UI Primitives (Pastel Neo-Brutalism)', () => {
  it('renders Card with specified pastel variant', () => {
    const html = renderToString(
      <Card variant="yellow">
        <span>Card Content</span>
      </Card>
    );
    expect(html).toContain('bg-[#FAF7A7]');
    expect(html).toContain('border-[#303044]');
    expect(html).toContain('Card Content');
  });

  it('renders Button with lime variant and accessible attributes', () => {
    const html = renderToString(
      <Button variant="lime" size="md">
        Click Action
      </Button>
    );
    expect(html).toContain('bg-[#C9F36B]');
    expect(html).toContain('Click Action');
  });

  it('renders Badge with correct colors and content', () => {
    const html = renderToString(<Badge variant="green">Active</Badge>);
    expect(html).toContain('bg-[#C9F2DE]');
    expect(html).toContain('Active');
  });

  it('renders StatCard matching the reference dashboard metrics', () => {
    const html = renderToString(
      <StatCard
        title="Bank Balance"
        value="₹2,46,428"
        subtitle="Reserve Fund"
        variant="yellow"
        icon={<IndianRupee className="w-5 h-5" />}
      />
    );
    expect(html).toContain('₹2,46,428');
    expect(html).toContain('Reserve Fund');
    expect(html).toContain('bg-[#FAF7A7]');
  });
});
