"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_EVENTS = exports.eventBus = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const logger_1 = require("../utils/logger");
class EventBus {
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this.emitter.setMaxListeners(50);
    }
    async publish(type, payload) {
        const event = {
            eventId: (0, crypto_1.randomUUID)(),
            type,
            payload,
            occurredAt: new Date().toISOString(),
        };
        const listeners = this.emitter.listeners(type);
        for (const listener of listeners) {
            try {
                await Promise.resolve(listener(event));
            }
            catch (err) {
                logger_1.logger.error('domain_event.listener_error', {
                    type,
                    eventId: event.eventId,
                    message: err?.message,
                });
            }
        }
        return event;
    }
    subscribe(type, listener) {
        this.emitter.on(type, (event) => {
            void Promise.resolve(listener(event)).catch((err) => {
                logger_1.logger.error('domain_event.listener_error_async', {
                    type,
                    eventId: event.eventId,
                    message: err?.message,
                });
            });
        });
    }
}
exports.eventBus = new EventBus();
exports.DOMAIN_EVENTS = {
    InventoryAdjusted: 'InventoryAdjusted',
    BatchConsumed: 'BatchConsumed',
    BatchQCPassed: 'BatchQCPassed',
};
