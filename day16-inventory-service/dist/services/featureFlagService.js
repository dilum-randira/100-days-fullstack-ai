"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFlag = exports.isEnabled = exports.getFlag = void 0;
const FeatureFlag_1 = require("../models/FeatureFlag");
const logger_1 = require("../utils/logger");
const getFlag = async (key) => {
    const flag = await FeatureFlag_1.FeatureFlag.findOne({ key }).exec();
    return flag;
};
exports.getFlag = getFlag;
const isEnabled = async (key) => {
    const flag = await (0, exports.getFlag)(key);
    return !!flag?.enabled;
};
exports.isEnabled = isEnabled;
const setFlag = async (key, enabled, description) => {
    const update = { enabled };
    if (description !== undefined) {
        update.description = description;
    }
    const flag = await FeatureFlag_1.FeatureFlag.findOneAndUpdate({ key }, { $set: update, $setOnInsert: { key } }, { upsert: true, new: true }).exec();
    logger_1.logger.info('feature.flag.updated', { key, enabled });
    return flag;
};
exports.setFlag = setFlag;
