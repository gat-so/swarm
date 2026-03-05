import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the three main panels', () => {
    render(<App />);
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Simulation')).toBeInTheDocument();
  });
});
