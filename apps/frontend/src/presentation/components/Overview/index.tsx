import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppChip from '../App/AppChip';
import AppLoader from '../App/AppLoader';
import AppMetricStrip from '../App/AppMetricStrip';
import AppPageHeader from '../App/AppPageHeader';
import AppTable, { AppTableColumn } from '../App/AppTable';
import { EndpointSummary, RecentActivityItem } from '../../../core/types/DashboardSummary';

export interface OverviewProps {
  isLoading: boolean;
  isError: boolean;
  inFlightCount: number;
  needsAttentionCount: number;
  dlqBacklogCount: number;
  endpoints: EndpointSummary;
  recentActivity: RecentActivityItem[];
  onActivityClick: (item: RecentActivityItem) => void;
}

const columns = (): AppTableColumn<RecentActivityItem>[] => [
  {
    key: 'eventType',
    header: 'Event',
    render: (row) => (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography fontWeight={800}>{row.eventType}</Typography>
        {row.isTest && <AppChip status="TEST" label="Test" size="small" />}
      </Stack>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <AppChip status={row.status} label={row.status} />,
  },
  {
    key: 'createdAt',
    header: 'Occurred',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
];

const Overview = ({
  isLoading,
  isError,
  inFlightCount,
  needsAttentionCount,
  dlqBacklogCount,
  endpoints,
  recentActivity,
  onActivityClick,
}: OverviewProps) => {
  return (
    <Stack spacing={3}>
      <AppPageHeader
        eyebrow="Operations console"
        title="Overview"
        description="Delivery health for the active project, at a glance."
      />

      {isError ? (
        <Alert severity="error" role="alert">
          Delivery health could not be loaded. Check connectivity and try again.
        </Alert>
      ) : isLoading ? (
        <AppLoader />
      ) : (
        <Stack spacing={3}>
          <AppMetricStrip
            metrics={[
              {
                label: 'In flight',
                value: inFlightCount,
                helper: 'Accepted, published, or processing',
                tone: 'info',
              },
              {
                label: 'Needs attention',
                value: needsAttentionCount,
                helper: 'Failed or partially failed',
                tone: needsAttentionCount > 0 ? 'danger' : 'accent',
              },
              {
                label: 'DLQ backlog',
                value: dlqBacklogCount,
                helper: 'Dead-lettered deliveries',
                tone: dlqBacklogCount > 0 ? 'warning' : 'accent',
              },
              {
                label: 'Endpoints',
                value: `${endpoints.enabled} / ${endpoints.enabled + endpoints.disabled}`,
                helper: 'Enabled of total configured',
                tone: endpoints.disabled > 0 ? 'warning' : 'neutral',
              },
            ]}
          />

          <AppTable
            columns={columns()}
            rows={recentActivity}
            getRowKey={(row) => row.eventId}
            onRowClick={onActivityClick}
            emptyMessage="No recent activity yet"
          />
        </Stack>
      )}
    </Stack>
  );
};

export default Overview;
