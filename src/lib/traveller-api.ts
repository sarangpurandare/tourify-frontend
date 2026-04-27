const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const T_ACCESS_KEY = 'tourify_t_access_token';
const T_REFRESH_KEY = 'tourify_t_refresh_token';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(T_ACCESS_KEY);
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

export function getTravellerTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access: localStorage.getItem(T_ACCESS_KEY),
    refresh: localStorage.getItem(T_REFRESH_KEY),
  };
}

export function setTravellerTokens(access: string, refresh: string) {
  localStorage.setItem(T_ACCESS_KEY, access);
  localStorage.setItem(T_REFRESH_KEY, refresh);
}

export function clearTravellerTokens() {
  localStorage.removeItem(T_ACCESS_KEY);
  localStorage.removeItem(T_REFRESH_KEY);
}

export const travellerApi = {
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

  async delete<T>(path: string): Promise<T> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(T_ACCESS_KEY);
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
