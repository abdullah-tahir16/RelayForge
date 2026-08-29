import { ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppTextField from '../../App/AppTextField';
import AppSelect from '../../App/AppSelect';
import AppAutocomplete from '../../App/AppAutocomplete';
import AppSurface from '../../App/AppSurface';
import AppButton from '../../App/AppButton';
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
    <AppSurface
      tone="raised"
      sx={{
        p: { xs: 2, sm: 2.25 },
        boxShadow: '0 10px 24px rgba(55, 46, 32, 0.06)',
      }}
    >
      <Stack spacing={1.5}>
        <Typography
          variant="caption"
          textTransform="uppercase"
          fontWeight={800}
          color="text.secondary"
        >
          Filter event history
        </Typography>
        <Box
          display="grid"
          gap={1.5}
          gridTemplateColumns={{
            xs: '1fr',
            lg: 'minmax(260px, 1fr) minmax(180px, 0.65fr) minmax(280px, 1fr)',
          }}
          alignItems="start"
        >
          <AppTextField
            label="Event type"
            value={filters.eventType ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...filters, eventType: event.target.value || undefined })
            }
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
          />
        </Box>
        <Box
          display="grid"
          gap={1.5}
          gridTemplateColumns={{
            xs: '1fr',
            lg: 'minmax(240px, 0.75fr) minmax(240px, 0.75fr) max-content',
          }}
          alignItems="start"
        >
          <AppTextField
            label="Created from"
            type="datetime-local"
            value={filters.createdFrom ?? ''}
            InputLabelProps={{ shrink: true }}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({
                ...filters,
                createdFrom: event.target.value || undefined,
              })
            }
          />
          <AppTextField
            label="Created to"
            type="datetime-local"
            value={filters.createdTo ?? ''}
            InputLabelProps={{ shrink: true }}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...filters, createdTo: event.target.value || undefined })
            }
          />
          <AppButton
            variant="outlined"
            onClick={() => onChange({})}
            sx={{
              alignSelf: 'center',
              minWidth: 132,
              whiteSpace: 'nowrap',
            }}
          >
            Reset filters
          </AppButton>
        </Box>
      </Stack>
    </AppSurface>
  );
};

export default Filters;
