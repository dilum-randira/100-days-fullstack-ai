"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableFeature = exports.enableFeature = exports.listFeatures = void 0;
const FeatureFlag_1 = require("../models/FeatureFlag");
const featureFlagService_1 = require("../services/featureFlagService");
const isAdmin = (req) => {
    const role = req.user?.role || req.headers['x-user-role'];
    return role === 'admin';
};
const listFeatures = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const flags = await FeatureFlag_1.FeatureFlag.find({}).sort({ key: 1 }).exec();
        res.status(200).json({ success: true, data: flags });
    }
    catch (error) {
        next(error);
    }
};
exports.listFeatures = listFeatures;
const enableFeature = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const { description } = req.body;
        const flag = await (0, featureFlagService_1.setFlag)(req.params.key, true, description);
        res.status(200).json({ success: true, data: flag });
    }
    catch (error) {
        next(error);
    }
};
exports.enableFeature = enableFeature;
const disableFeature = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const { description } = req.body;
        const flag = await (0, featureFlagService_1.setFlag)(req.params.key, false, description);
        res.status(200).json({ success: true, data: flag });
    }
    catch (error) {
        next(error);
    }
};
exports.disableFeature = disableFeature;
