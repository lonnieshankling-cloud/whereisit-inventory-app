import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QuickAccessSections } from './QuickAccessSections';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(() => ({
    getToken: vi.fn(async () => 'mock-token'),
    isSignedIn: true,
  })),
}));

vi.mock('~backend/client', () => ({
  default: {
    with: vi.fn(() => ({
      item: {
        recent: vi.fn(),
      },
      location: {
        list: vi.fn(),
      },
    })),
    item: {
      recent: vi.fn(),
    },
    location: {
      list: vi.fn(),
    },
  },
}));

vi.mock('./ExpiringItems', () => ({
  ExpiringItems: () => <div>Expiring Items</div>,
}));

vi.mock('./LowStockItems', () => ({
  LowStockItems: () => <div>Low Stock Items</div>,
}));

vi.mock('./RecentItems', () => ({
  RecentItems: () => <div>Recent Items</div>,
}));

vi.mock('./FavoriteItems', () => ({
  FavoriteItems: () => <div>Favorite Items</div>,
}));

vi.mock('./LocationsList', () => ({
  LocationsList: () => <div>Locations List</div>,
}));

import backend from '~backend/client';

describe('QuickAccessSections - Initial Page Load', () => {
  const mockBackend = {
    item: {
      recent: vi.fn(),
    },
    location: {
      list: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(backend.with).mockReturnValue(mockBackend as any);
  });

  it('should display a global error if initial data fetch fails', async () => {
    mockBackend.item.recent.mockRejectedValueOnce(new Error('Network error'));
    mockBackend.location.list.mockRejectedValueOnce(new Error('Network error'));

    render(<QuickAccessSections />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load inventory/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Expiring Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Stock Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Favorite Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Locations List')).not.toBeInTheDocument();
  });
});
