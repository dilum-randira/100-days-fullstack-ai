import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from './config';
import { AuthenticatedRequest } from './middleware';

const commonProxyOptions = {
  changeOrigin: true,
  logLevel: 'warn' as const,
  onProxyReq: (proxyReq: any, req: AuthenticatedRequest) => {
    // Propagate request ID and user info to downstream services
    if (req.requestId) {
      proxyReq.setHeader('x-request-id', req.requestId);
    }
    if (req.correlationId) {
      proxyReq.setHeader('x-correlation-id', req.correlationId);
    }
    if (req.user) {
      proxyReq.setHeader('x-user-id', (req.user as any).sub || (req.user as any).id || '');
      proxyReq.setHeader('x-user-role', (req.user as any).role || '');
    }
  },
};

export const authProxy = createProxyMiddleware({
  ...commonProxyOptions,
  target: config.services.auth,
  pathRewrite: {
    '^/api/auth': '/api/auth',
  },
});

export const inventoryProxy = createProxyMiddleware({
  ...commonProxyOptions,
  target: config.services.inventory,
  pathRewrite: {
    '^/api/inventory': '/api',
  },
});

export const analyticsProxy = createProxyMiddleware({
  ...commonProxyOptions,
  target: config.services.analytics,
  pathRewrite: {
    '^/api/analytics': '/api/analytics',
  },
});
