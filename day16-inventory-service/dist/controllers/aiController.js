"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictQualityHandler = void 0;
const zod_1 = require("zod");
const aiService_1 = require("../services/aiService");
const qualitySchema = zod_1.z
    .object({
    size: zod_1.z.number(),
    colorScore: zod_1.z.number().min(0).max(100),
    defectCount: zod_1.z.number().int().min(0),
    moisture: zod_1.z.number(),
})
    .strict();
const predictQualityHandler = async (req, res, next) => {
    const requestId = req.requestId;
    const startedAt = Date.now();
    try {
        const parsed = qualitySchema.parse(req.body);
        const prediction = await (0, aiService_1.predictQuality)(parsed);
        const durationMs = Date.now() - startedAt;
        res.status(200).json({
            success: true,
            data: prediction,
            requestId,
            meta: {
                durationMs,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.predictQualityHandler = predictQualityHandler;
