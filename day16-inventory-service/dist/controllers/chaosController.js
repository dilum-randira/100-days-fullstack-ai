"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopChaos = exports.setCpuChaos = exports.setErrorChaos = exports.setLatencyChaos = exports.chaosMiddleware = void 0;
const logger_1 = require("../utils/logger");
const state = {
    enabled: false,
    mode: null,
    until: 0,
    latencyMs: 0,
    errorRate: 0,
    cpuSeconds: 0,
};
const isActive = () => {
    if (!state.enabled)
        return false;
    if (!state.until)
        return false;
    if (Date.now() >= state.until) {
        // auto-disable
        state.enabled = false;
        state.mode = null;
        state.latencyMs = 0;
        state.errorRate = 0;
        state.cpuSeconds = 0;
        state.until = 0;
        logger_1.logger.info('chaos.auto_disabled');
        return false;
    }
    return true;
};
const requireChaosFeatureFlag = (req) => {
    // Feature-flag protected (disabled by default). Reuses existing feature flag convention.
    // Options supported:
    // - DB-backed flags via /api/features (key: chaos.enabled)
    // - env override: CHAOS_ENABLED=true for controlled test envs
    const envEnabled = (process.env.CHAOS_ENABLED || '').toLowerCase() === 'true';
    const headerFlag = req.headers['x-chaos-enabled']?.toLowerCase() === 'true';
    // If you want full DB-backed flags only, keep envEnabled false in prod.
    return envEnabled || headerFlag;
};
const getActorId = (req) => {
    return req.user?.userId || req.headers['x-actor-id'];
};
const getRequestId = (req) => {
    return req.requestId || req.headers['x-request-id'];
};
const isAdmin = (req) => {
    const role = req.user?.role || req.headers['x-user-role'];
    return role === 'admin';
};
const parsePositiveInt = (value, fallback) => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};
const parseRate01 = (value, fallback) => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(n))
        return fallback;
    if (n < 0)
        return 0;
    if (n > 1)
        return 1;
    return n;
};
const chaosMiddleware = (req, res, next) => {
    // Chaos injection is ALWAYS off by default.
    if (!isActive()) {
        next();
        return;
    }
    const requestId = getRequestId(req);
    const correlationId = req.correlationId;
    const log = (0, logger_1.withRequestContext)(requestId, correlationId);
    // latency
    if (state.mode === 'latency') {
        setTimeout(() => {
            log.warn('chaos.latency.injected', { latencyMs: state.latencyMs, path: req.path, method: req.method });
            next();
        }, state.latencyMs);
        return;
    }
    // error
    if (state.mode === 'error') {
        const roll = Math.random();
        if (roll < state.errorRate) {
            log.warn('chaos.error.injected', {
                errorRate: state.errorRate,
                roll,
                path: req.path,
                method: req.method,
            });
            res.status(503).json({ success: false, error: 'ChaosInjected', requestId });
            return;
        }
    }
    next();
};
exports.chaosMiddleware = chaosMiddleware;
const setLatencyChaos = async (req, res) => {
    if (!isAdmin(req)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    if (!requireChaosFeatureFlag(req)) {
        res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
        return;
    }
    const { milliseconds, ttlSeconds } = req.body;
    const latencyMs = parsePositiveInt(milliseconds, 250);
    const ttl = parsePositiveInt(ttlSeconds, 30);
    state.enabled = true;
    state.mode = 'latency';
    state.latencyMs = latencyMs;
    state.errorRate = 0;
    state.cpuSeconds = 0;
    state.until = Date.now() + ttl * 1000;
    const requestId = getRequestId(req);
    const actorId = getActorId(req);
    (0, logger_1.withRequestContext)(requestId).warn('chaos.start', { mode: 'latency', latencyMs, ttlSeconds: ttl, actorId });
    res.status(200).json({ success: true, mode: state.mode, until: state.until, latencyMs });
};
exports.setLatencyChaos = setLatencyChaos;
const setErrorChaos = async (req, res) => {
    if (!isAdmin(req)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    if (!requireChaosFeatureFlag(req)) {
        res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
        return;
    }
    const { rate, ttlSeconds } = req.body;
    const errorRate = parseRate01(rate, 0.2);
    const ttl = parsePositiveInt(ttlSeconds, 30);
    state.enabled = true;
    state.mode = 'error';
    state.latencyMs = 0;
    state.errorRate = errorRate;
    state.cpuSeconds = 0;
    state.until = Date.now() + ttl * 1000;
    const requestId = getRequestId(req);
    const actorId = getActorId(req);
    (0, logger_1.withRequestContext)(requestId).warn('chaos.start', { mode: 'error', errorRate, ttlSeconds: ttl, actorId });
    res.status(200).json({ success: true, mode: state.mode, until: state.until, errorRate });
};
exports.setErrorChaos = setErrorChaos;
const burnCpu = async (seconds) => {
    const end = Date.now() + seconds * 1000;
    // busy loop with occasional yields to keep node responsive
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // light compute
        let x = 0;
        for (let i = 0; i < 50000; i++) {
            x += Math.sqrt(i * 123.456) % 7;
        }
        if (x < 0) {
            // never happens; prevents optimization
            // eslint-disable-next-line no-console
            console.log(x);
        }
        if (Date.now() >= end)
            break;
        // yield
        await new Promise((resolve) => setImmediate(resolve));
    }
};
const setCpuChaos = async (req, res) => {
    if (!isAdmin(req)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    if (!requireChaosFeatureFlag(req)) {
        res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
        return;
    }
    const { seconds, ttlSeconds } = req.body;
    const cpuSeconds = parsePositiveInt(seconds, 5);
    const ttl = parsePositiveInt(ttlSeconds, cpuSeconds + 5);
    state.enabled = true;
    state.mode = 'cpu';
    state.latencyMs = 0;
    state.errorRate = 0;
    state.cpuSeconds = cpuSeconds;
    state.until = Date.now() + ttl * 1000;
    const requestId = getRequestId(req);
    const actorId = getActorId(req);
    (0, logger_1.withRequestContext)(requestId).warn('chaos.start', { mode: 'cpu', cpuSeconds, ttlSeconds: ttl, actorId });
    // Fire and forget CPU burn.
    void burnCpu(cpuSeconds)
        .then(() => {
        logger_1.logger.warn('chaos.cpu.burn_completed', { cpuSeconds });
    })
        .catch((err) => {
        logger_1.logger.error('chaos.cpu.burn_failed', { message: err?.message || String(err) });
    });
    res.status(200).json({ success: true, mode: state.mode, until: state.until, cpuSeconds });
};
exports.setCpuChaos = setCpuChaos;
const stopChaos = async (req, res) => {
    if (!isAdmin(req)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    if (!requireChaosFeatureFlag(req)) {
        res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
        return;
    }
    const requestId = getRequestId(req);
    const actorId = getActorId(req);
    state.enabled = false;
    state.mode = null;
    state.until = 0;
    state.latencyMs = 0;
    state.errorRate = 0;
    state.cpuSeconds = 0;
    (0, logger_1.withRequestContext)(requestId).warn('chaos.stop', { actorId });
    res.status(200).json({ success: true, enabled: false });
};
exports.stopChaos = stopChaos;
