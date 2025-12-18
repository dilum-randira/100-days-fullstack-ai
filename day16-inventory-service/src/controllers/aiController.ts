import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { predictQuality } from '../services/aiService';

const qualitySchema = z
  .object({
    size: z.number(),
    colorScore: z.number().min(0).max(100),
    defectCount: z.number().int().min(0),
    moisture: z.number(),
  })
  .strict();

export const predictQualityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const requestId = (req as any).requestId;
  const startedAt = Date.now();

  try {
    const parsed = qualitySchema.parse(req.body);

    const prediction = await predictQuality(parsed);

    const durationMs = Date.now() - startedAt;

    res.status(200).json({
      success: true,
      data: prediction,
      requestId,
      meta: {
        durationMs,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'ValidationError',
        details: error.flatten(),
        requestId,
      });
      return;
    }

    next(error);
  }
};
