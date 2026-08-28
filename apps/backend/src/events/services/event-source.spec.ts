import { EventSource } from '../entities/event.entity';
import {
  ENDPOINT_TEST_EVENT_TYPE,
  buildEndpointTestPayload,
  endpointTestTargetId,
} from './event-source';

describe('event source helpers', () => {
  it('builds a reserved endpoint-test payload without caller supplied data', () => {
    const sentAt = new Date('2026-08-29T10:00:00.000Z');

    expect(buildEndpointTestPayload('endpoint-1', sentAt)).toEqual({
      message: 'RelayForge endpoint test delivery',
      endpointId: 'endpoint-1',
      sentAt: '2026-08-29T10:00:00.000Z',
    });
    expect(ENDPOINT_TEST_EVENT_TYPE).toBe('relayforge.endpoint.test');
  });

  it('uses the internal event source as the endpoint-test marker', () => {
    expect(
      endpointTestTargetId({
        source: EventSource.ENDPOINT_TEST,
        testTargetEndpointId: 'endpoint-1',
      }),
    ).toBe('endpoint-1');
    expect(
      endpointTestTargetId({
        source: EventSource.CUSTOMER,
        testTargetEndpointId: 'endpoint-1',
      }),
    ).toBeNull();
  });
});

