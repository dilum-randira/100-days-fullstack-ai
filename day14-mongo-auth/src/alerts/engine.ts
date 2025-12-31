import { randomUUID } from 'crypto';
import { getDbDegradedState } from '../db';
import { snapshotPerf } from '../perf/perfMetrics';
import { getAdaptiveRateLimitState } from '../middleware/adaptiveRateLimit';
import { getStreamConsumerMetrics } from '../stream/EventConsumer';
import type { Alert, AlertRule, AlertStatus } from './types';
import { consoleLoggerNotifier } from './notifier';

type EngineOptions = {
  notifier?: typeof consoleLoggerNotifier;
  defaultDedupeWindowMs?: number;
};

type RuleRuntime = {
  nextRunAtMs: number;
  lastFiredAtMs?: number;
  alertId?: string;
};

type EngineState = {
  alerts: Alert[];
  // for dedupe by key
  runtime: Record<string, RuleRuntime>;
  started: boolean;
};

const state: EngineState = {
  alerts: [],
  runtime: {},
  started: false,
};

const nowIso = () => new Date().toISOString();

const updateStatus = (alert: Alert, status: AlertStatus) => {
  const t = nowIso();
  alert.status = status;
  alert.updatedAt = t;
  if (status === 'ACKNOWLEDGED') alert.acknowledgedAt = t;
  if (status === 'RESOLVED') alert.resolvedAt = t;
};

const getOrCreateRuntime = (key: string): RuleRuntime => {
  if (!state.runtime[key]) state.runtime[key] = { nextRunAtMs: 0 };
  return state.runtime[key];
};

const getOpenAlertByKey = (key: string): Alert | undefined => {
  return state.alerts.find((a) => a.key === key && (a.status === 'OPEN' || a.status === 'ACKNOWLEDGED'));
};

const createAlert = (rule: AlertRule, descriptionOverride?: string, meta?: Record<string, unknown>): Alert => {
  const t = nowIso();
  return {
    id: randomUUID(),
    key: rule.key,
    title: rule.title,
    description: descriptionOverride || rule.description,
    severity: rule.severity,
    status: 'OPEN',
    createdAt: t,
    updatedAt: t,
    meta,
  };
};

const resolveAlert = async (alert: Alert, notifier = consoleLoggerNotifier) => {
  if (alert.status === 'RESOLVED') return;
  updateStatus(alert, 'RESOLVED');
  await notifier.onResolve(alert);
};

const openOrUpdateAlert = async (
  rule: AlertRule,
  runtime: RuleRuntime,
  evalResult: { description?: string; meta?: Record<string, unknown> },
  notifier = consoleLoggerNotifier,
) => {
  const existing = getOpenAlertByKey(rule.key);
  if (existing) {
    // keep it open; update description/meta timestamp but do not create storms
    existing.description = evalResult.description || existing.description;
    existing.meta = evalResult.meta || existing.meta;
    existing.updatedAt = nowIso();
    return;
  }

  const a = createAlert(rule, evalResult.description, evalResult.meta);
  state.alerts.unshift(a);
  runtime.alertId = a.id;
  runtime.lastFiredAtMs = Date.now();
  await notifier.onOpen(a);
};

const shouldDedupe = (runtime: RuleRuntime, dedupeWindowMs: number): boolean => {
  if (!runtime.lastFiredAtMs) return false;
  return Date.now() - runtime.lastFiredAtMs < dedupeWindowMs;
};

const buildDefaultRules = (): AlertRule[] => {
  const groupId = process.env.STREAM_CONSUMER_GROUP || 'analytics-pipeline-v1';

  return [
    {
      key: 'auth.error_rate.high',
      title: 'High 5xx error rate',
      description: 'The service is returning an elevated rate of 5xx responses',
      severity: 'critical',
      intervalMs: 10_000,
      dedupeWindowMs: 60_000,
      evaluate: async () => {
        const limits = getAdaptiveRateLimitState();
        const errRate = limits.telemetry.errorRate;
        const fired = errRate >= 0.05 && limits.telemetry.reqCountWindow >= 50;
        return {
          fired,
          description: fired ? `5xx error rate ${Math.round(errRate * 1000) / 10}% over last window` : undefined,
          meta: { errorRate: errRate, reqCountWindow: limits.telemetry.reqCountWindow },
        };
      },
    },
    {
      key: 'auth.latency.p95.high',
      title: 'High request latency p95',
      description: 'Request latency p95 has exceeded threshold',
      severity: 'warning',
      intervalMs: 15_000,
      dedupeWindowMs: 60_000,
      evaluate: async () => {
        const perf = snapshotPerf();
        // take worst p95 across recorded keys
        let worstKey: string | null = null;
        let worstP95 = 0;
        for (const [k, v] of Object.entries(perf)) {
          if (v.p95Ms > worstP95) {
            worstP95 = v.p95Ms;
            worstKey = k;
          }
        }

        const fired = worstP95 >= 800 && worstKey !== null;
        return {
          fired,
          description: fired ? `p95 ${Math.round(worstP95)}ms (worst: ${worstKey})` : undefined,
          meta: { worstKey, p95Ms: worstP95 },
        };
      },
    },
    {
      key: 'auth.db.unavailable',
      title: 'Database unavailable for writes',
      description: 'MongoDB primary is unavailable or connection is degraded',
      severity: 'critical',
      intervalMs: 10_000,
      dedupeWindowMs: 60_000,
      evaluate: async () => {
        const db = getDbDegradedState();
        const fired = !db.canWrite;
        return {
          fired,
          description: fired ? `DB cannot write (state=${db.state})` : undefined,
          meta: db,
        };
      },
    },
    {
      key: 'auth.queue.lag.high',
      title: 'Queue lag high',
      description: 'Event consumer lag has exceeded threshold',
      severity: 'warning',
      intervalMs: 10_000,
      dedupeWindowMs: 60_000,
      evaluate: async () => {
        const m = getStreamConsumerMetrics(groupId);
        const fired = m.consumerLag >= Number(process.env.ALERT_QUEUE_LAG_THRESHOLD || 5000);
        return {
          fired,
          description: fired ? `consumerLag=${m.consumerLag}` : undefined,
          meta: m,
        };
      },
    },
  ];
};

export const getAlerts = (): Alert[] => state.alerts.slice(0, 200);

export const acknowledgeAlert = async (id: string): Promise<Alert | null> => {
  const alert = state.alerts.find((a) => a.id === id);
  if (!alert) return null;
  if (alert.status === 'RESOLVED') return alert;

  updateStatus(alert, 'ACKNOWLEDGED');
  await consoleLoggerNotifier.onAcknowledge(alert);
  return alert;
};

export const startAlertEngine = (opts?: EngineOptions): void => {
  if (state.started) return;
  state.started = true;

  const notifier = opts?.notifier || consoleLoggerNotifier;
  const rules = buildDefaultRules();

  const loop = async () => {
    for (const rule of rules) {
      const rt = getOrCreateRuntime(rule.key);

      if (Date.now() < rt.nextRunAtMs) continue;
      rt.nextRunAtMs = Date.now() + rule.intervalMs;

      // storm protection / dedupe
      const dedupeWindowMs = rule.dedupeWindowMs || opts?.defaultDedupeWindowMs || 60_000;

      try {
        const result = await rule.evaluate();
        if (result.fired) {
          if (!shouldDedupe(rt, dedupeWindowMs)) {
            await openOrUpdateAlert(rule, rt, result, notifier);
          }
        } else {
          const open = getOpenAlertByKey(rule.key);
          if (open) {
            await resolveAlert(open, notifier);
          }
        }
      } catch (err: any) {
        // Engine should never crash the process.
        const open = getOpenAlertByKey(rule.key);
        if (!open) {
          const fallbackRule: AlertRule = {
            key: `alerts.engine.error.${rule.key}`,
            title: 'Alert engine rule evaluation failed',
            description: 'A rule threw an exception during evaluation',
            severity: 'warning',
            intervalMs: 60_000,
            dedupeWindowMs: 120_000,
            evaluate: async () => ({ fired: true }),
          };
          const rtFallback = getOrCreateRuntime(fallbackRule.key);
          if (!shouldDedupe(rtFallback, 120_000)) {
            await openOrUpdateAlert(
              fallbackRule,
              rtFallback,
              { description: `Rule ${rule.key} failed: ${err?.message || String(err)}` },
              notifier,
            );
          }
        }
      }
    }
  };

  const intervalMs = Number(process.env.ALERT_ENGINE_TICK_MS || 1_000);
  const t = setInterval(() => void loop(), Math.max(250, intervalMs));
  (t as any).unref?.();
};
