/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Implemented direct confirmed RabbitMQ publisher for user.registered events with error isolation.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Replaced manual amqplib connection/channel state with createRabbitPublisher from @campus-errand/messaging.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by huangjiaxi1111, yanhwee)
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import { createRabbitPublisher } from '@campus-errand/messaging';
import { logError } from '../utils/logger';

export interface UserEventPublisher {
  publishUserRegistered(event: UserRegisteredEvent): Promise<boolean>;
  close(): Promise<void>;
}

export interface RabbitMQPublisherConfig {
  url: string;
  exchange: string;
  connectionTimeoutMs?: number;
}

export function createRabbitMQPublisher(config: RabbitMQPublisherConfig): UserEventPublisher {
  const rabbit = createRabbitPublisher(config);
  let isClosing = false;

  return {
    async publishUserRegistered(event: UserRegisteredEvent): Promise<boolean> {
      if (isClosing) return false;
      try {
        await rabbit.publish(config.exchange, event.eventType, event, {
          messageId: event.eventId,
        });
        return true;
      } catch (error) {
        logError('user_registered_publish_failed', error, {
          userId: event.userId,
          eventId: event.eventId,
        });
        return false;
      }
    },

    async close(): Promise<void> {
      isClosing = true;
      await rabbit.close();
    },
  };
}

export const noopPublisher: UserEventPublisher = {
  async publishUserRegistered() { return true; },
  async close() {},
};
