"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictQuality = void 0;
const logger_1 = require("../utils/logger");
const clamp = (value, min, max) => {
    return Math.min(max, Math.max(min, value));
};
const predictQuality = async (input) => {
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
        let grade;
        if (score >= 80) {
            grade = 'A';
        }
        else if (score >= 60) {
            grade = 'B';
        }
        else {
            grade = 'C';
        }
        const confidence = Number((score / 100).toFixed(2));
        const durationMs = Date.now() - start;
        logger_1.logger.info('ai.predict_quality.completed', {
            grade,
            confidence,
            durationMs,
        });
        return { grade, confidence };
    }
    catch (err) {
        const durationMs = Date.now() - start;
        logger_1.logger.error('ai.predict_quality.failed', {
            message: err.message,
            durationMs,
        });
        throw err;
    }
};
exports.predictQuality = predictQuality;
