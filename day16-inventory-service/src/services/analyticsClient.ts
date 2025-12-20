import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';

export interface RequestContext {
  requestId?: string;
  correlationId?: string;
}

export interface InventorySummary {
  totalItems: number;
  totalQuantity: number;
}

export interface TrendingItem {
  sku: string;
  productName: string;
  totalQuantity: number;
}

export interface TopItem extends TrendingItem {}

const ANALYTICS_TIMEOUT_MS = 2000;
const ANALYTICS_RETRY_COUNT = 2;

const createClient = (): AxiosInstance => {
  const baseURL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5000/api/analytics';

  return axios.create({
    baseURL,
    timeout: ANALYTICS_TIMEOUT_MS,
  });
};

const client = createClient();

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<AxiosResponse<T>>,
  retries = ANALYTICS_RETRY_COUNT,
): Promise<AxiosResponse<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger.warn('analytics.client.request_failed', {
        attempt,
        message: (err as any)?.message,
      });
      if (attempt < retries) {
        await sleep(100 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

export const fetchInventorySummary = async (
  context?: RequestContext,
): Promise<InventorySummary | null> => {
  try {
    const response = await withRetry(() =>
      client.get<InventorySummary>('/inventory/summary', {
        headers: {
          'x-request-id': context?.requestId,
          'x-correlation-id': context?.correlationId,
        },
      }),
    );
    return response.data;
  } catch (err) {
    logger.error('analytics.client.summary.failed', { message: (err as any)?.message });
    return null;
  }
};

export const fetchTrendingItems = async (
  limit = 10,
  context?: RequestContext,
): Promise<TrendingItem[] | null> => {
  try {
    const response = await withRetry(() =>
      client.get<TrendingItem[]>(`/inventory/trending?limit=${limit}`, {
        headers: {
          'x-request-id': context?.requestId,
          'x-correlation-id': context?.correlationId,
        },
      }),
    );
    return response.data;
  } catch (err) {
    logger.error('analytics.client.trending.failed', { message: (err as any)?.message });
    return null;
  }
};

export const fetchTopItems = async (
  limit = 10,
  context?: RequestContext,
): Promise<TopItem[] | null> => {
  try {
    const response = await withRetry(() =>
      client.get<TopItem[]>(`/inventory/top?limit=${limit}`, {
        headers: {
          'x-request-id': context?.requestId,
          'x-correlation-id': context?.correlationId,
        },
      }),
    );
    return response.data;
  } catch (err) {
    logger.error('analytics.client.top.failed', { message: (err as any)?.message });
    return null;
  }
};
