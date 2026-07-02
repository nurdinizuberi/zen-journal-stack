const DEFAULT_API_BASE = 'http://localhost:5000/api';

export const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE;

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';

  let payload: unknown = null;
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String((payload as { error?: unknown }).error) : 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export const apiGet = <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: 'GET' }, token);
export const apiPost = <T>(path: string, body: unknown, token?: string | null) => apiRequest<T>(path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }, token);
export const apiPatch = <T>(path: string, body: unknown, token?: string | null) => apiRequest<T>(path, { method: 'PATCH', body: typeof body === 'string' ? body : JSON.stringify(body) }, token);
export const apiDelete = <T>(path: string, token?: string | null) => apiRequest<T>(path, { method: 'DELETE' }, token);
