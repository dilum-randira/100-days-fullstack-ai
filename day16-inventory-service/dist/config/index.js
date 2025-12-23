"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const parsePort = (value, fallback) => {
    const num = value ? Number(value) : NaN;
    return Number.isFinite(num) && num > 0 ? num : fallback;
};
const required = (name, value) => {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};
const rawNodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const port = parsePort(process.env.PORT, 3000);
const mongoUri = required('MONGO_URI', process.env.MONGO_URI);
const jwtAccessSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
const jwtRefreshSecret = required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const redisUrl = required('REDIS_URL', process.env.REDIS_URL);
exports.config = {
    port,
    nodeEnv: rawNodeEnv,
    mongoUri,
    jwt: {
        accessSecret: jwtAccessSecret,
        refreshSecret: jwtRefreshSecret,
    },
    redisUrl,
};
