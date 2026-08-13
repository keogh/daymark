import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/renderer/app/App';

describe('App', () => {
  it('renders the foundation shell', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Time Tracker' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Application shell loaded.')).toBeInTheDocument();
  });
});
