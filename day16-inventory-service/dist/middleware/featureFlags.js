"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = void 0;
const featureFlagService_1 = require("../services/featureFlagService");
const logger_1 = require("../utils/logger");
const requireFeature = (key) => {
    return async (req, res, next) => {
        try {
            const enabled = await (0, featureFlagService_1.isEnabled)(key);
            if (!enabled) {
                logger_1.logger.warn('feature.disabled', { key, path: req.path, method: req.method });
                res.status(503).json({ success: false, error: 'FeatureDisabled', feature: key });
                return;
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('feature.check.failed', { key, message: error.message });
            res.status(503).json({ success: false, error: 'FeatureCheckFailed', feature: key });
        }
    };
};
exports.requireFeature = requireFeature;
