"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markShuttingDown = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const ai_1 = __importDefault(require("./routes/ai"));
const features_1 = __importDefault(require("./routes/features"));
const errorHandler_1 = require("./middlewares/errorHandler");
const logger_1 = require("./utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
require("./events/listeners");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
const chaos_1 = __importDefault(require("./routes/chaos"));
const chaosController_1 = require("./controllers/chaosController");
// simple in-memory metrics
let totalRequests = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;
const app = (0, express_1.default)();
app.set('trust proxy', 1);
// security headers
app.disable('x-powered-by');
app.use((0, helmet_1.default)());
// CORS with strict allowlist
const rawOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
const allowlist = rawOrigins;
if (process.env.NODE_ENV === 'production') {
    if (!allowlist.length || allowlist.includes('*')) {
        throw new Error('In production, CORS_ORIGINS must be set to specific origins and cannot include *');
    }
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowlist.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
// JSON body limit 100kb
app.use(body_parser_1.default.json({ limit: '100kb' }));
// Chaos middleware (disabled by default; feature-flag protected)
app.use(chaosController_1.chaosMiddleware);
// metrics middleware
app.use((req, res, next) => {
    const start = Date.now();
    totalRequests += 1;
    res.on('finish', () => {
        const duration = Date.now() - start;
        totalResponseTimeMs += duration;
        if (res.statusCode >= 500) {
            errorCount += 1;
        }
    });
    next();
});
// HTTP logging via morgan -> winston
app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
    stream: logger_1.httpLoggerStream,
}));
app.get('/', (_req, res) => {
    res.json({
        message: 'Day 16 - Inventory Service',
        docs: '/docs',
        versions: {
            v1: '/api/v1',
            v2: '/api/v2',
        },
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});
// Readiness gate: flipped off during SIGTERM shutdown to stop K8s routing traffic.
let isShuttingDown = false;
const markShuttingDown = () => {
    isShuttingDown = true;
};
exports.markShuttingDown = markShuttingDown;
app.get('/ready', (_req, res) => {
    if (isShuttingDown) {
        res.status(503).json({ ready: false, shuttingDown: true });
        return;
    }
    const state = mongoose_1.default.connection.readyState;
    const ready = state === 1; // connected
    res.status(ready ? 200 : 503).json({ ready, state });
});
app.get('/metrics', (_req, res) => {
    const avgResponseTime = totalRequests ? totalResponseTimeMs / totalRequests : 0;
    res.json({
        totalRequests,
        errorCount,
        avgResponseTimeMs: avgResponseTime,
    });
});
// Swagger docs
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Admin-only chaos endpoints (protected in controller)
app.use('/api/chaos', chaos_1.default);
app.use('/api/ai', ai_1.default);
// API versioning
app.use('/api/v1/inventory', inventory_1.default);
app.use('/api/v2/inventory', inventory_1.default);
// keep backward compatibility for now
app.use('/api/inventory', inventory_1.default);
app.use('/api/features', features_1.default);
// error handler last
app.use(errorHandler_1.errorHandler);
exports.default = app;
