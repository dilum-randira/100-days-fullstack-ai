"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const featureFlagController_1 = require("../controllers/featureFlagController");
const router = (0, express_1.Router)();
router.get('/', featureFlagController_1.listFeatures);
router.post('/:key/enable', featureFlagController_1.enableFeature);
router.post('/:key/disable', featureFlagController_1.disableFeature);
exports.default = router;
