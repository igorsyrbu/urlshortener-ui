import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithAuth, API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

// Mock the auth store
vi.mock('@/lib/store/auth', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('fetchWithAuth', () => {
  const mockToken = 'mock-access-token';
  const mockEndpoint = '/test-endpoint';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup
    (useAuthStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      accessToken: mockToken,
      setAccessToken: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include Authorization header when token exists', async () => {
    const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await fetchWithAuth(mockEndpoint);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}${mockEndpoint}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should not include Authorization header for logout requests', async () => {
    const mockResponse = new Response(null, { status: 200 });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await fetchWithAuth('/users/sessions/current', { method: 'DELETE' });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/users/sessions/current`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should handle successful GET requests', async () => {
    const mockData = { id: '1', name: 'Test' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const response = await fetchWithAuth(mockEndpoint);

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockData);
  });

  it('should handle POST requests with body', async () => {
    const mockRequestBody = { title: 'Test Link', url: 'https://example.com' };
    const mockResponse = new Response(JSON.stringify({ id: '123' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await fetchWithAuth(mockEndpoint, {
      method: 'POST',
      body: JSON.stringify(mockRequestBody),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}${mockEndpoint}`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockRequestBody),
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should preserve custom headers', async () => {
    const mockResponse = new Response(null, { status: 200 });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    await fetchWithAuth(mockEndpoint, {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}${mockEndpoint}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        }),
      })
    );
  });
});


