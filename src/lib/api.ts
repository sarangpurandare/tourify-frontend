const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const ACCESS_TOKEN_KEY = 'tourify_access_token';
const REFRESH_TOKEN_KEY = 'tourify_refresh_token';
const IMPERSONATION_TOKEN_KEY = 'tourify_imp_token';
const IMPERSONATION_FLAG_KEY = 'tourify_imp_active';

function getImpersonationJwt(): string | null {
  if (typeof window === 'undefined') return null;
  if (sessionStorage.getItem(IMPERSONATION_FLAG_KEY) !== 'true') return null;
  return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const impJwt = getImpersonationJwt();
  if (impJwt) {
    headers['Authorization'] = `Bearer ${impJwt}`;
    return headers;
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: response.statusText }
    }));
    throw new Error(error.error?.message || response.statusText);
  }
  return response.json();
}

export function getStoredTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem(ACCESS_TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setStoredTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, { headers });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string, body?: unknown): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    const impJwt = getImpersonationJwt();
    if (impJwt) {
      headers['Authorization'] = `Bearer ${impJwt}`;
    } else if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },
};
