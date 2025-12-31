import { sloConfig } from './sloConfig';
import { getSLI } from './metrics';
import { logger } from '../utils/logger';

// Error budget computed per configured SLO over the configured window in metrics
// Simple model: remaining = availability target - observed unavailability

export type BurnSignal = 'ok' | 'slow' | 'fast' | 'exhausted';

export const computeErrorBudget = (serviceName: string) => {
  const cfg = sloConfig[serviceName];
  if (!cfg) throw new Error(`No SLO config for ${serviceName}`);

  const sli = getSLI();
  const targetAvail = cfg.availability / 100; // e.g., 0.999
  const observedAvail = sli.availability / 100;

  const budget = Math.max(0, targetAvail - (1 - observedAvail));
  // Interpret budget fraction: budgetFrac = remaining allowable fraction of errors in window
  const budgetFrac = Math.max(0, (targetAvail - (1 - observedAvail)) / targetAvail);

  // burn rate: observed error fraction / allowed error fraction
  const observedErrFrac = 1 - observedAvail;
  const allowedErrFrac = Math.max(1e-9, 1 - targetAvail);
  const burnRate = observedErrFrac / allowedErrFrac;

  let signal: BurnSignal = 'ok';
  if (burnRate > 2) signal = 'fast';
  else if (burnRate > 1) signal = 'slow';
  if (burnRate > 10 || budgetFrac <= 0) signal = 'exhausted';

  const remainingPercent = Math.max(0, budgetFrac * 100);

  const res = {
    service: serviceName,
    targetAvailability: cfg.availability,
    observedAvailabilityPercent: Number((sli.availability).toFixed(4)),
    remainingErrorBudgetPercent: Number(remainingPercent.toFixed(4)),
    burnRate: Number(burnRate.toFixed(4)),
    signal,
    sli,
  } as const;

  logger.info('slo.error_budget', res);
  return res;
};

export const isBudgetExhausted = (serviceName: string): boolean => {
  const b = computeErrorBudget(serviceName);
  return b.signal === 'exhausted' || b.remainingErrorBudgetPercent <= 0;
};

export const getErrorBudgetState = (serviceName: string) => computeErrorBudget(serviceName);
