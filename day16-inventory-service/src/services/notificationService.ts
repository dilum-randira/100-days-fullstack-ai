import { logger } from '../utils/logger';
import { inventoryQueue } from '../queues/inventoryQueue';

export type NotificationType = 'LOW_STOCK' | 'QC_FAILED' | 'SYSTEM_ALERT';

export interface BaseNotificationPayload {
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface NotificationJobData {
  type: NotificationType;
  payload: BaseNotificationPayload;
}

/**
 * Fire-and-forget async notification dispatch.
 * Current behavior:
 * - Log to console/logger.
 * - Enqueue into BullMQ inventory queue if available.
 *
 * Future behavior:
 * - Replace internals with Email/SMS/Push providers while keeping the same API.
 */
export const sendNotification = async (
  type: NotificationType,
  payload: BaseNotificationPayload,
): Promise<void> => {
  const { requestId, ...safePayload } = payload;
  const meta: Record<string, unknown> = { type, requestId };

  // Basic console/log output (no sensitive data).
  logger.info('notification.dispatch', {
    ...meta,
    payload: safePayload,
  });

  // Enqueue as a background job if BullMQ queue is configured.
  try {
    if (inventoryQueue) {
      const jobData: NotificationJobData = {
        type,
        payload: { ...payload },
      };

      await inventoryQueue.add('notification', jobData, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      logger.info('notification.queued', {
        ...meta,
      });
    } else {
      logger.warn('notification.queue_unavailable', meta);
    }
  } catch (err: any) {
    logger.error('notification.queue_failed', {
      ...meta,
      error: err.message,
    });
  }
};
