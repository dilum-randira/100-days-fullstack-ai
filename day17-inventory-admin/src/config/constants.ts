export const API_BASE_URL = import.meta.env.VITE_API_URL as string;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'inventory_admin_access_token',
  REFRESH_TOKEN: 'inventory_admin_refresh_token',
  USER: 'inventory_admin_user',
} as const;
