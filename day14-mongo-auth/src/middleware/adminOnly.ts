import type { NextFunction, Request, Response } from 'express';

const getRole = (req: Request): string | undefined => {
  return (req as any).user?.role || (req.headers['x-user-role'] as string | undefined);
};

export const adminOnly = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRole(req);
    if (role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  };
};
