import { logger } from '../utils/logger';
import type { Alert } from './types';

export interface AlertNotifier {
  onOpen: (alert: Alert) => Promise<void>;
  onAcknowledge: (alert: Alert) => Promise<void>;
  onResolve: (alert: Alert) => Promise<void>;
}

// Current notifier: console + logger.
// Designed for future Slack/Email integrations by implementing AlertNotifier.
export const consoleLoggerNotifier: AlertNotifier = {
  async onOpen(alert) {
    // eslint-disable-next-line no-console
    console.warn('alert.open', { id: alert.id, key: alert.key, severity: alert.severity, title: alert.title });
    logger.warn('alert.open', { id: alert.id, key: alert.key, severity: alert.severity, title: alert.title });
  },
  async onAcknowledge(alert) {
    // eslint-disable-next-line no-console
    console.log('alert.ack', { id: alert.id, key: alert.key, title: alert.title });
    logger.info('alert.ack', { id: alert.id, key: alert.key, title: alert.title });
  },
  async onResolve(alert) {
    // eslint-disable-next-line no-console
    console.log('alert.resolved', { id: alert.id, key: alert.key, title: alert.title });
    logger.info('alert.resolved', { id: alert.id, key: alert.key, title: alert.title });
  },
};
