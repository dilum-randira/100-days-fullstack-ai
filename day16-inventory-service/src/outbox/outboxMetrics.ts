type OutboxMetricsState = {
  publishedSuccessTotal: number;
  publishedFailureTotal: number;
};

const state: OutboxMetricsState = {
  publishedSuccessTotal: 0,
  publishedFailureTotal: 0,
};

export const outboxMetrics = {
  markPublishSuccess(): void {
    state.publishedSuccessTotal += 1;
  },
  markPublishFailure(): void {
    state.publishedFailureTotal += 1;
  },
  snapshot() {
    return { ...state };
  },
};
