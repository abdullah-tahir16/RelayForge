import { buildWebhookRequest } from './webhook-request.builder';
import { DeliveryRequestedMessage } from '@relayforge/kafka-contracts';

describe('buildWebhookRequest', () => {
  const message: DeliveryRequestedMessage = {
    version: 1,
    deliveryId: 'del_123',
    eventId: 'evt_123',
    endpointId: 'end_123',
    eventType: 'order.completed',
    eventCreatedAt: '2026-08-17T14:30:00.000Z',
    data: { orderId: 'ORD-123' },
    endpointUrl: 'https://example.com/webhook',
    endpointTimeoutMs: 10000,
  };

  it('targets the endpoint URL and honors its timeout', () => {
    const request = buildWebhookRequest(message);
    expect(request.url).toBe('https://example.com/webhook');
    expect(request.timeoutMs).toBe(10000);
  });

  it('sets the documented RelayForge headers', () => {
    const request = buildWebhookRequest(message);
    expect(request.headers['X-RelayForge-Event']).toBe('order.completed');
    expect(request.headers['X-RelayForge-Event-Id']).toBe('evt_123');
    expect(request.headers['X-RelayForge-Delivery-Id']).toBe('del_123');
    expect(request.headers['X-RelayForge-Timestamp']).toMatch(/^\d+$/);
  });

  it('builds a JSON body carrying the event envelope and data', () => {
    const request = buildWebhookRequest(message);
    expect(JSON.parse(request.body)).toEqual({
      id: 'evt_123',
      event: 'order.completed',
      createdAt: '2026-08-17T14:30:00.000Z',
      data: { orderId: 'ORD-123' },
    });
  });
});
