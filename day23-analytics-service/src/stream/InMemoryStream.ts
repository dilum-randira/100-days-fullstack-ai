import { EventEmitter } from 'events';
import type { StreamEvent } from './types';

export type StreamTopic = 'domain-events';

type Subscriber = (event: StreamEvent) => void | Promise<void>;

class InMemoryStream {
  private emitter = new EventEmitter();
  private queue: StreamEvent[] = [];
  private offsets = new Map<string, number>();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  public publish(topic: StreamTopic, event: StreamEvent): void {
    this.queue.push(event);
    this.emitter.emit(topic, event);
  }

  public subscribe(topic: StreamTopic, groupId: string, handler: Subscriber): () => void {
    if (!this.offsets.has(groupId)) this.offsets.set(groupId, 0);

    const consume = async () => {
      const offset = this.offsets.get(groupId) ?? 0;
      for (let i = offset; i < this.queue.length; i += 1) {
        const e = this.queue[i];
        await handler(e);
        this.offsets.set(groupId, i + 1);
      }
    };

    const listener = () => {
      void consume().catch(() => {
        // consumer handles retries
      });
    };

    this.emitter.on(topic, listener);
    void consume().catch(() => {
      // consumer handles retries
    });

    return () => this.emitter.off(topic, listener);
  }

  public getLag(groupId: string): number {
    const offset = this.offsets.get(groupId) ?? 0;
    return Math.max(0, this.queue.length - offset);
  }

  public getQueueDepth(): number {
    return this.queue.length;
  }
}

export const inMemoryStream = new InMemoryStream();
