import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationsList } from './LocationsList';
import type { Location } from '~backend/location/create';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(() => ({
    getToken: vi.fn(async () => 'mock-token'),
    isSignedIn: true,
  })),
}));

vi.mock('~backend/client', () => ({
  default: {
    with: vi.fn(() => ({
      location: {
        list: vi.fn(),
        create: vi.fn(),
      },
    })),
    location: {
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import backend from '~backend/client';

describe('LocationsList - Add Location', () => {
  const mockLocations: Location[] = [
    {
      id: 1,
      userId: 'user-123',
      name: 'Kitchen',
      createdAt: new Date('2025-10-01'),
    },
    {
      id: 2,
      userId: 'user-123',
      name: 'Garage',
      createdAt: new Date('2025-10-02'),
    },
  ];

  const mockBackend = {
    location: {
      list: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(backend.with).mockReturnValue(mockBackend as any);
  });

  it('should add a new location successfully on valid input', async () => {
    const newLocation: Location = {
      id: 3,
      userId: 'user-123',
      name: 'New Test Room',
      createdAt: new Date('2025-10-03'),
    };

    mockBackend.location.list
      .mockResolvedValueOnce({ locations: mockLocations })
      .mockResolvedValueOnce({ locations: [...mockLocations, newLocation] });
    
    mockBackend.location.create.mockResolvedValueOnce(newLocation);

    render(<LocationsList />);

    await waitFor(() => {
      expect(screen.getByText('Kitchen')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add new location...');
    const addButton = screen.getByRole('button', { name: /add/i });

    fireEvent.change(input, { target: { value: 'New Test Room' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockBackend.location.create).toHaveBeenCalledWith({ name: 'New Test Room' });
    });

    await waitFor(() => {
      expect(screen.getByText('New Test Room')).toBeInTheDocument();
    });

    expect(input).toHaveValue('');
  });

  it('should display an error message when the API fails', async () => {
    mockBackend.location.list.mockResolvedValueOnce({ locations: mockLocations });
    mockBackend.location.create.mockRejectedValueOnce(new Error('API Error'));

    render(<LocationsList />);

    await waitFor(() => {
      expect(screen.getByText('Kitchen')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add new location...');
    const addButton = screen.getByRole('button', { name: /add/i });

    fireEvent.change(input, { target: { value: 'Failed Room' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Could not add location/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Failed Room')).not.toBeInTheDocument();
  });
});
