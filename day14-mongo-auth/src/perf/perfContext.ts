import { AsyncLocalStorage } from 'async_hooks';

export type PerfContext = {
  requestId?: string;
  correlationId?: string;
};

export const perfContext = new AsyncLocalStorage<PerfContext>();

export const runWithPerfContext = <T>(ctx: PerfContext, fn: () => T): T => {
  return perfContext.run(ctx, fn);
};
