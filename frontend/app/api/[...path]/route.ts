import { NextRequest } from 'next/server';

interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

/** Forward same-origin API calls to the runtime-configured backend service. */
async function proxy(request: NextRequest, context: ProxyContext): Promise<Response> {
  const { path } = await context.params;
  const requestUrl = new URL(request.url);
  const backendOrigin = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
  const target = new URL(`/api/${path.join('/')}${requestUrl.search}`, backendOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    // Forward a browser request stream without buffering it in the frontend service.
    duplex: 'half',
  } as RequestInit);
  return new Response(response.body, { status: response.status, headers: response.headers });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
