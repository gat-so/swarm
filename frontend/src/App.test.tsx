import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock fetch to avoid real API calls in tests
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    }),
  );
});

describe('App', () => {
  it('renders the three main panels', () => {
    render(<App />);
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Simulation')).toBeInTheDocument();
  });

  it('shows empty state when no sources exist', () => {
    render(<App />);
    expect(screen.getByText('No sources yet')).toBeInTheDocument();
    expect(screen.getByText('Add files to get started')).toBeInTheDocument();
  });
});
