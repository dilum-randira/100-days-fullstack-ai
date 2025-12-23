"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const featureFlags_1 = require("../middleware/featureFlags");
const router = (0, express_1.Router)();
router.post('/predict-quality', (0, featureFlags_1.requireFeature)('ai.inference'), aiController_1.predictQualityHandler);
exports.default = router;
