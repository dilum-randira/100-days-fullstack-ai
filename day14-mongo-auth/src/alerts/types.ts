export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type Alert = {
  id: string;
  key: string; // unique dedupe key
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  // debug-safe metadata
  meta?: Record<string, unknown>;
};

export type AlertRule = {
  key: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  // How often to evaluate in ms
  intervalMs: number;
  // Dedupe window for repeated firings in ms
  dedupeWindowMs: number;
  evaluate: () => Promise<{ fired: boolean; description?: string; meta?: Record<string, unknown> }>;
};
