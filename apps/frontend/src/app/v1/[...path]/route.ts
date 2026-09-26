import { getClientTelemetryHeaders, getCorrelationId } from '@/lib/request-context';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = `${process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080'}/v1`;

/**
 * BFF catch-all reverse proxy Route Handler for client-side /v1 API calls.
 * Replaces static edge rewrites to ensure 100% of outbound API traffic
 * is dynamically stamped with cryptographic telemetry signatures.
 */
async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = `${API_BASE_URL}/${path.join('/')}${request.nextUrl.search}`;
  const correlationId = await getCorrelationId();
  const telemetryHeaders = await getClientTelemetryHeaders();

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-correlation-id', correlationId);
  Object.entries(telemetryHeaders).forEach(([key, value]) => {
    forwardedHeaders.set(key, value);
  });

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.blob()
      : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: forwardedHeaders,
      body,
      cache: 'no-store',
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'API Gateway unavailable',
        error: error instanceof Error ? error.message : 'Unknown network error',
      },
      { status: 503 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
