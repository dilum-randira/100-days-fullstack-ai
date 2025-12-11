export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface InventoryItem {
  _id: string;
  productName: string;
  sku?: string;
  batchCode?: string;
  quantity: number;
  minThreshold: number;
  status: string;
  location: string;
  supplier?: string;
  unit: string;
}

export interface InventoryLog {
  _id: string;
  itemId: string;
  delta: number;
  oldQuantity: number;
  newQuantity: number;
  createdAt: string;
}

export interface Batch {
  _id: string;
  batchCode: string;
  supplier?: string;
  totalWeight: number;
  remainingWeight: number;
  createdAt: string;
}

export interface Summary {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  totalValue?: number;
}

export interface LocationStat {
  location: string;
  quantity: number;
}

export interface Stats {
  byLocation: LocationStat[];
}

export interface TrendPoint {
  date: string;
  quantity: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  supplier?: string;
  batchCode?: string;
}
