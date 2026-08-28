import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventListItem } from '../../../../core/types/Event';
import Table from '.';

const event: EventListItem = {
  id: 'event-1',
  event: 'relayforge.endpoint.test',
  status: 'PROCESSING',
  createdAt: '2026-08-29T10:00:00.000Z',
  deliveryTotal: 1,
  deliverySucceeded: 0,
  isTest: true,
  testTargetEndpointId: 'endpoint-1',
};

describe('Events table', () => {
  it('marks endpoint-test events and preserves row click behavior', () => {
    const onRowClick = vi.fn();
    render(
      <Table
        rows={[event]}
        page={1}
        pageSize={25}
        total={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onRowClick={onRowClick}
      />,
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
    fireEvent.click(screen.getByText('relayforge.endpoint.test'));
    expect(onRowClick).toHaveBeenCalledWith(event);
  });
});

