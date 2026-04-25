import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (DEV_BYPASS) {
    const staffId = typeof window !== 'undefined' ? localStorage.getItem('dev_staff_id') : null;
    if (staffId) {
      headers['X-Dev-Staff-Id'] = staffId;
    }
    return headers;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
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

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, { headers });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<T>(response);
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    if (DEV_BYPASS) {
      const staffId = typeof window !== 'undefined' ? localStorage.getItem('dev_staff_id') : null;
      if (staffId) {
        headers['X-Dev-Staff-Id'] = staffId;
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },
};
