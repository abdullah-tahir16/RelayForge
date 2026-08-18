import { ChangeEvent } from 'react';
import Stack from '@mui/material/Stack';
import AppTextField from '../../App/AppTextField';
import AppSelect from '../../App/AppSelect';
import AppAutocomplete from '../../App/AppAutocomplete';
import { EventFilters, EventStatus } from '../../../../core/types/Event';
import { EndpointLookupItem } from '../../../../core/types/Endpoint';
import { EVENT_STATUS_OPTIONS } from './data';

export interface FiltersProps {
  filters: EventFilters;
  endpointOptions: EndpointLookupItem[];
  onChange: (filters: EventFilters) => void;
}

const Filters = ({ filters, endpointOptions, onChange }: FiltersProps) => {
  const selectedEndpoint = endpointOptions.find(
    (endpoint) => endpoint.id === filters.endpointId,
  );

  return (
    <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
      <AppTextField
        label="Event type"
        value={filters.eventType ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...filters, eventType: event.target.value || undefined })
        }
        sx={{ width: 200 }}
      />
      <AppSelect
        label="Status"
        options={EVENT_STATUS_OPTIONS}
        value={filters.status ?? ''}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            ...filters,
            status: (event.target.value as EventStatus) || undefined,
          })
        }
        sx={{ width: 200 }}
      />
      <AppAutocomplete
        label="Endpoint"
        placeholder="Any endpoint"
        options={endpointOptions.map((endpoint) => ({
          id: endpoint.id,
          label: endpoint.name,
        }))}
        value={
          selectedEndpoint
            ? { id: selectedEndpoint.id, label: selectedEndpoint.name }
            : null
        }
        onChange={(_event, value) =>
          onChange({ ...filters, endpointId: value?.id })
        }
        sx={{ width: 220 }}
      />
    </Stack>
  );
};

export default Filters;
