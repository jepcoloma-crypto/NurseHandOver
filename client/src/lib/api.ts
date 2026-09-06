const API_BASE = '/api/v1';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    );
  }

  // If response has extra fields beyond just 'data' (pagination, unreadCount, stats, etc.),
  // return the full response so callers can access all fields
  const extraKeys = Object.keys(data).filter(k => k !== 'success' && k !== 'data');
  if (extraKeys.length > 0) {
    return { data: data.data, ...Object.fromEntries(extraKeys.map(k => [k, data[k]])) } as T;
  }
  return data.data as T;
}
