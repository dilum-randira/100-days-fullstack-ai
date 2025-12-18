import { logger } from '../utils/logger';

export interface QualityInput {
  size: number;
  colorScore: number;
  defectCount: number;
  moisture: number;
}

export type QualityGrade = 'A' | 'B' | 'C';

export interface QualityPrediction {
  grade: QualityGrade;
  confidence: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const predictQuality = async (input: QualityInput): Promise<QualityPrediction> => {
  const start = Date.now();

  try {
    // Simple rule-based scoring as a stand-in for a real ML model.
    let score = 0;

    // Size contribution: prefer mid-range size (normalized around 50)
    const sizeDeviation = Math.abs(input.size - 50);
    score += clamp(100 - sizeDeviation * 2, 0, 100) * 0.3;

    // Color score: already in 0-100 range
    score += clamp(input.colorScore, 0, 100) * 0.4;

    // Defects: penalty
    const defectPenalty = clamp(input.defectCount * 15, 0, 100);
    score += (100 - defectPenalty) * 0.2;

    // Moisture: prefer around 12%
    const moistureDeviation = Math.abs(input.moisture - 12);
    score += clamp(100 - moistureDeviation * 5, 0, 100) * 0.1;

    score = clamp(score, 0, 100);

    let grade: QualityGrade;
    if (score >= 80) {
      grade = 'A';
    } else if (score >= 60) {
      grade = 'B';
    } else {
      grade = 'C';
    }

    const confidence = Number((score / 100).toFixed(2));

    const durationMs = Date.now() - start;
    logger.info('ai.predict_quality.completed', {
      grade,
      confidence,
      durationMs,
    });

    return { grade, confidence };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    logger.error('ai.predict_quality.failed', {
      message: err.message,
      durationMs,
    });
    throw err;
  }
};
