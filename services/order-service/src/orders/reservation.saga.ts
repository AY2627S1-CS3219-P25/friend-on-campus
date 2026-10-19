/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Implement the author-approved outbox-only submission and credit-result saga.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { randomUUID } from 'node:crypto';
import type { CreditReservationRequestEvent, CreditReservationResultEvent, OrderSubmissionDTO } from '@campus-errand/common-dtos';
import type { PrismaClient } from '../database/client';
import type { CreateOrderParams } from '../repositories/order.repository';
import { OrderAuthorizationError, OrderNotFoundError, OrderValidationError, toOrderDTO } from './order.types';

export type SubmissionPayload = CreditReservationRequestEvent & {
  submission: Omit<CreateOrderParams, 'expiresAt'> & { expiresAt: string; requesterId: string };
  reason?: string;
};

export interface ReservationSaga {
  submit(data: CreateOrderParams): Promise<OrderSubmissionDTO>;
  get(id: string, requesterId: string): Promise<OrderSubmissionDTO>;
  handleResult(event: CreditReservationResultEvent): Promise<void>;
}

export function createReservationSaga(prisma: PrismaClient): ReservationSaga {
  return {
    async submit(data) {
      const id = data.id ?? randomUUID();
      const payload: SubmissionPayload = {
        eventId: id, correlationId: id, eventType: 'order.reservation.requested',
        timestamp: new Date().toISOString(), orderId: id, requesterId: data.requesterId,
        rewardCredits: data.rewardCredits, expiresAt: data.expiresAt.toISOString(),
        submission: { ...data, id, expiresAt: data.expiresAt.toISOString() },
      };
      // The durable submission and the message are the same outbox row. No Order is inserted here.
      await prisma.outboxEvent.create({ data: { id, eventType: payload.eventType, payload: JSON.stringify(payload) } });
      return { id, status: 'PENDING' };
    },
    async get(id, requesterId) {
      const record = await prisma.outboxEvent.findUnique({ where: { id } });
      if (!record || record.eventType !== 'order.reservation.requested') throw new OrderNotFoundError('Submission not found');
      const payload = JSON.parse(record.payload) as SubmissionPayload;
      if (payload.requesterId !== requesterId) throw new OrderAuthorizationError();
      const status = record.status === 'COMPLETED' ? 'OPEN'
        : ['REJECTED', 'COMPENSATING', 'COMPENSATED'].includes(record.status)
          ? record.status as OrderSubmissionDTO['status'] : 'PENDING';
      const order = record.status === 'COMPLETED' ? await prisma.order.findUnique({ where: { id } }) : null;
      return { id, status, ...(payload.reason && { reason: payload.reason }), ...(order && { order: toOrderDTO(order) }) };
    },
    async handleResult(event) {
      await prisma.$transaction(async tx => {
        // Serialize duplicate/concurrent results and the compensation transition across processes.
        await tx.$queryRaw`SELECT id FROM outbox_events WHERE id = ${event.correlationId}::uuid FOR UPDATE`;
        const record = await tx.outboxEvent.findUnique({ where: { id: event.correlationId } });
        if (!record || record.eventType !== 'order.reservation.requested') throw new OrderValidationError('Unknown reservation correlation');
        const payload = JSON.parse(record.payload) as SubmissionPayload;
        if (payload.orderId !== event.orderId || payload.requesterId !== event.requesterId || payload.rewardCredits !== event.rewardCredits) {
          throw new OrderValidationError('Reservation result does not match submission');
        }
        if (['COMPLETED', 'REJECTED', 'COMPENSATED'].includes(record.status)) return;
        if (event.eventType === 'credit.reservation.released') {
          if (record.status !== 'COMPENSATING') throw new OrderValidationError('Unexpected reservation release');
          await tx.outboxEvent.update({ where: { id: record.id }, data: { status: 'COMPENSATED' } });
          return;
        }
        if (record.status === 'COMPENSATING') return;
        if (event.eventType === 'credit.reservation.failed') {
          await tx.outboxEvent.update({ where: { id: record.id }, data: {
            status: 'REJECTED', payload: JSON.stringify({ ...payload, reason: event.reason }),
          } });
          return;
        }
        const expiresAt = new Date(payload.expiresAt);
        if (expiresAt.getTime() <= Date.now()) {
          const release: CreditReservationRequestEvent = {
            eventId: randomUUID(), eventType: 'order.reservation.release_requested',
            correlationId: payload.correlationId, orderId: payload.orderId, requesterId: payload.requesterId,
            rewardCredits: payload.rewardCredits, expiresAt: payload.expiresAt, timestamp: new Date().toISOString(),
          };
          // A late success must release the hold, without ever making an expired errand claimable.
          await tx.outboxEvent.create({ data: { id: release.eventId, eventType: release.eventType, payload: JSON.stringify(release) } });
          await tx.outboxEvent.update({ where: { id: record.id }, data: {
            status: 'COMPENSATING', payload: JSON.stringify({ ...payload, reason: 'Submission expired before reservation confirmation' }),
          } });
          return;
        }
        const order = await tx.order.create({ data: { ...payload.submission, expiresAt, status: 'OPEN' } });
        const created = {
          eventId: randomUUID(), eventType: 'order.created', timestamp: new Date().toISOString(),
          orderId: order.id, orderCode: order.orderCode, requesterId: order.requesterId,
          rewardCredits: order.rewardCredits, campusZone: order.campusZone ?? 'Campus', expiresAt: order.expiresAt.toISOString(),
        };
        await tx.outboxEvent.create({ data: { id: created.eventId, eventType: created.eventType, payload: JSON.stringify(created) } });
        await tx.outboxEvent.update({ where: { id: record.id }, data: { status: 'COMPLETED' } });
      });
    },
  };
}
