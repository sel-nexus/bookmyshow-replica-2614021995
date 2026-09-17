import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/[...path]/route';

/** Verify API forwarding resolves the backend target when the frontend starts. */
describe('runtime API proxy', () => {
  beforeEach((): void => { vi.restoreAllMocks(); });

  it('forwards a same-origin API request to API_PROXY_TARGET at runtime', async (): Promise<void> => {
    process.env.API_PROXY_TARGET = 'http://backend-service:4000';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{\"data\":{\"status\":\"ok\"}}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://frontend:3000/api/health?probe=1');
    const response = await GET(request, { params: Promise.resolve({ path: ['health'] }) });
    expect(fetchMock).toHaveBeenCalledWith(new URL('http://backend-service:4000/api/health?probe=1'), expect.objectContaining({ method: 'GET' }));
    expect(response.status).toBe(200);
  });
});
