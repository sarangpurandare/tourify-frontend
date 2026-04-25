export interface APIResponse<T> {
  data: T;
  meta?: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}
