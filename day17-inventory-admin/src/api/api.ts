import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';
import type {
  ApiResponse,
  Batch,
  InventoryItem,
  InventoryListParams,
  InventoryLog,
  LoginResponse,
  PaginatedResult,
  Stats,
  Summary,
  TrendPoint,
} from '../types';

// Helper to get tokens from localStorage
const getTokens = () => {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  return { accessToken, refreshToken };
};

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

interface RequestOptions extends RequestInit {
  retry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { accessToken, refreshToken } = getTokens();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && !options.retry && refreshToken) {
    // try refresh
    const newTokens = await refreshTokenRequest(refreshToken).catch(() => null);
    if (newTokens) {
      setTokens(newTokens.accessToken, newTokens.refreshToken);
      // retry original request once
      return request<T>(path, { ...options, retry: true });
    }
    clearTokens();
    throw new Error('Unauthorized. Please login again.');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const data = (await res.json()) as ApiResponse<T>;
  return data.data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Login failed');
  }

  const data = (await res.json()) as ApiResponse<LoginResponse>;
  const { accessToken, refreshToken, user } = data.data;
  setTokens(accessToken, refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return data.data;
}

export async function refreshTokenRequest(refreshToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Token refresh failed');
  }

  const data = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  return data.data;
}

export const getInventorySummary = (threshold?: number) => {
  const params = threshold != null ? `?threshold=${threshold}` : '';
  return request<Summary>(`/api/inventory/summary${params}`);
};

export const getInventoryStats = () => {
  return request<Stats>('/api/inventory/stats');
};

export const getInventoryTrends = (days: number) => {
  return request<TrendPoint[]>(`/api/inventory/trends?days=${days}`);
};

export const listInventory = (params: InventoryListParams = {}) => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.location) searchParams.set('location', params.location);
  if (params.supplier) searchParams.set('supplier', params.supplier);
  if (params.batchCode) searchParams.set('batchCode', params.batchCode);

  const query = searchParams.toString();
  return request<PaginatedResult<InventoryItem>>(`/api/inventory${query ? `?${query}` : ''}`);
};

export const getItem = (id: string) => {
  return request<InventoryItem>(`/api/inventory/${id}`);
};

export const getItemLogs = (id: string, page = 1, limit = 20) => {
  return request<PaginatedResult<InventoryLog>>(`/api/inventory/${id}/logs?page=${page}&limit=${limit}`);
};

export const adjustItem = (id: string, delta: number) => {
  return request<InventoryItem>(`/api/inventory/${id}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ delta }),
  });
};

export const listBatches = () => {
  return request<Batch[]>('/api/batches');
};

export const createBatch = (payload: Partial<Batch>) => {
  return request<Batch>('/api/batches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const consumeBatch = (id: string, amount: number) => {
  return request<Batch>(`/api/batches/${id}/consume`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

export const createItemsFromBatch = (id: string, payload: { items: Array<{ productName: string; quantity: number; unit: string; location: string }> }) => {
  return request<InventoryItem[]>(`/api/batches/${id}/create-items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const api = {
  login,
  refreshTokenRequest,
  getInventorySummary,
  getInventoryStats,
  getInventoryTrends,
  listInventory,
  getItem,
  getItemLogs,
  adjustItem,
  listBatches,
  createBatch,
  consumeBatch,
  createItemsFromBatch,
};
