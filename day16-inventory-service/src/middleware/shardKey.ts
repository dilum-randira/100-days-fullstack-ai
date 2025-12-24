import { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

export type ShardContext = {
  organizationId?: string;
  shardKeySource?: 'header' | 'query' | 'body' | 'path';
};

const normalize = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

export const shardKeyMiddleware = (req: Request & ShardContext, _res: Response, next: NextFunction): void => {
  const headerName = config.sharding.shardKeyHeaderName.toLowerCase();
  const headerVal = normalize(req.headers[headerName] as any);
  const queryVal = normalize((req.query as any).organizationId);
  const bodyVal = normalize((req.body as any)?.organizationId);
  const pathVal = normalize((req.params as any)?.organizationId);

  const organizationId = headerVal || queryVal || bodyVal || pathVal;

  if (organizationId) {
    req.organizationId = organizationId;
    req.shardKeySource = headerVal
      ? 'header'
      : queryVal
        ? 'query'
        : bodyVal
          ? 'body'
          : 'path';

    logger.debug?.('shard.key.present', {
      organizationId,
      source: req.shardKeySource,
      path: req.path,
    });
  } else {
    logger.debug?.('shard.key.missing', { path: req.path, method: req.method });
  }

  next();
};

// Enforce shard key for shard-friendly endpoints in production.
export const requireShardKey = (req: Request & ShardContext, res: Response, next: NextFunction): void => {
  if (config.nodeEnv !== 'production') {
    next();
    return;
  }

  if (!config.sharding.requiredInProd) {
    next();
    return;
  }

  if (!req.organizationId) {
    res.status(400).json({
      success: false,
      error: 'organizationId is required',
      message: 'Shard key is required in production for shard-friendly routing',
    });
    return;
  }

  next();
};
