import { Request, Response, NextFunction } from 'express';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryLog } from '../models/InventoryLog';
import { logger } from '../utils/logger';

type ExportFormat = 'json' | 'csv';

const getFormat = (req: Request): ExportFormat => {
  const format = (req.query.format as string | undefined)?.toLowerCase();
  return format === 'csv' ? 'csv' : 'json';
};

const isAdmin = (req: Request): boolean => {
  const role = (req as any).user?.role || (req.headers['x-user-role'] as string | undefined);
  return role === 'admin';
};

const logAudit = (req: Request, resource: string, format: ExportFormat): void => {
  const userId = (req as any).user?.id || (req.headers['x-user-id'] as string | undefined);
  const requestId = (req as any).requestId || (req.headers['x-request-id'] as string | undefined);
  const correlationId = (req as any).correlationId || (req.headers['x-correlation-id'] as string | undefined);

  logger.info('audit.export', {
    resource,
    format,
    userId,
    requestId,
    correlationId,
  });
};

const setDownloadHeaders = (res: Response, name: string, format: ExportFormat): void => {
  const ext = format === 'csv' ? 'csv' : 'json';
  res.setHeader('Content-Disposition', `attachment; filename="${name}.${ext}"`);
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
};

const writeCsvRow = (res: Response, fields: (string | number | boolean | null | undefined)[]): void => {
  const escaped = fields.map((field) => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  });
  res.write(escaped.join(',') + '\n');
};

export const exportInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const format = getFormat(req);
    logAudit(req, 'inventory', format);
    setDownloadHeaders(res, 'inventory', format);

    const cursor = InventoryItem.find({}).cursor();

    if (format === 'csv') {
      writeCsvRow(res, ['_id', 'productName', 'sku', 'quantity', 'unit', 'location', 'supplier', 'status', 'minThreshold', 'createdAt', 'updatedAt']);
      for await (const doc of cursor) {
        writeCsvRow(res, [
          doc._id.toString(),
          doc.productName,
          doc.sku,
          doc.quantity,
          doc.unit,
          doc.location,
          doc.supplier,
          doc.status,
          doc.minThreshold,
          doc.createdAt?.toISOString(),
          doc.updatedAt?.toISOString(),
        ]);
      }
      res.end();
      return;
    }

    // JSON streaming as NDJSON for large datasets
    res.write('[');
    let first = true;
    for await (const doc of cursor) {
      const plain = doc.toJSON();
      if (!first) {
        res.write(',');
      } else {
        first = false;
      }
      res.write(JSON.stringify(plain));
    }
    res.write(']');
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const format = getFormat(req);
    logAudit(req, 'logs', format);
    setDownloadHeaders(res, 'logs', format);

    const cursor = InventoryLog.find({}).cursor();

    if (format === 'csv') {
      writeCsvRow(res, ['_id', 'itemId', 'delta', 'oldQuantity', 'newQuantity', 'createdAt']);
      for await (const doc of cursor) {
        writeCsvRow(res, [
          doc._id.toString(),
          doc.itemId.toString(),
          doc.delta,
          doc.oldQuantity,
          doc.newQuantity,
          doc.createdAt?.toISOString(),
        ]);
      }
      res.end();
      return;
    }

    res.write('[');
    let first = true;
    for await (const doc of cursor) {
      const plain = doc.toJSON();
      if (!first) {
        res.write(',');
      } else {
        first = false;
      }
      res.write(JSON.stringify(plain));
    }
    res.write(']');
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const format = getFormat(req);
    logAudit(req, 'batches', format);
    setDownloadHeaders(res, 'batches', format);

    // Placeholder: when Batch model exists, replace this with real streaming query
    res.status(501).json({ success: false, error: 'NotImplemented' });
  } catch (error) {
    next(error);
  }
};
