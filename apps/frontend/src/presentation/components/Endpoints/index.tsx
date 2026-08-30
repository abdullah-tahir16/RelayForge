import Stack from '@mui/material/Stack';
import Header from './Header';
import Table from './Table';
import Form from './Form';
import { EndpointFormSchemaValues } from './Form/data';
import AppConfirmDialog from '../App/AppConfirmDialog';
import { Endpoint, SigningSecretRotated } from '../../../core/types/Endpoint';
import OneTimeSecretDialog from '../SigningSecret';
import AppMetricStrip from '../App/AppMetricStrip';

export interface EndpointsProps {
  rows: Endpoint[];
  onRowClick: (endpoint: Endpoint) => void;
  onToggleEnabled: (endpoint: Endpoint) => void;
  isFormOpen: boolean;
  formTitle: string;
  formInitialValues?: Partial<EndpointFormSchemaValues>;
  isSubmitting: boolean;
  formError?: string;
  onCreateClick: () => void;
  onEditClick: (endpoint: Endpoint) => void;
  onFormSubmit: (values: EndpointFormSchemaValues) => void;
  onFormCancel: () => void;
  deleteTarget: Endpoint | null;
  onDeleteClick: (endpoint: Endpoint) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  oneTimeSecret: SigningSecretRotated | null;
  onOneTimeSecretAcknowledge: () => void;
}

const Endpoints = ({
  rows,
  onRowClick,
  onToggleEnabled,
  isFormOpen,
  formTitle,
  formInitialValues,
  isSubmitting,
  formError,
  onCreateClick,
  onEditClick,
  onFormSubmit,
  onFormCancel,
  deleteTarget,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  oneTimeSecret,
  onOneTimeSecretAcknowledge,
}: EndpointsProps) => {
  const enabledCount = rows.filter((row) => row.enabled).length;
  const disabledCount = rows.length - enabledCount;
  const averageTimeout =
    rows.length > 0
      ? Math.round(
          rows.reduce((total, row) => total + row.timeoutMs, 0) / rows.length,
        )
      : 0;

  return (
    <Stack spacing={3}>
      <Header onCreateClick={onCreateClick} />
      <AppMetricStrip
        metrics={[
          {
            label: 'Endpoints',
            value: rows.length,
            helper: 'Configured receivers',
            tone: 'neutral',
          },
          {
            label: 'Enabled',
            value: enabledCount,
            helper: 'Accepting delivery traffic',
            tone: 'accent',
          },
          {
            label: 'Disabled',
            value: disabledCount,
            helper: 'Not receiving new deliveries',
            tone: disabledCount > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Avg timeout',
            value: `${averageTimeout}ms`,
            helper: 'Across visible endpoints',
            tone: 'info',
          },
        ]}
      />
      <Table
        rows={rows}
        onRowClick={onRowClick}
        onEdit={onEditClick}
        onDelete={onDeleteClick}
        onToggleEnabled={onToggleEnabled}
      />
      <Form
        open={isFormOpen}
        title={formTitle}
        initialValues={formInitialValues}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={onFormSubmit}
        onCancel={onFormCancel}
      />
      <AppConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete endpoint"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={onDeleteConfirm}
        onCancel={onDeleteCancel}
      />
      <OneTimeSecretDialog
        open={Boolean(oneTimeSecret)}
        secret={oneTimeSecret?.signingSecret ?? ''}
        version={oneTimeSecret?.version ?? 1}
        rotatedAt={oneTimeSecret?.rotatedAt ?? new Date(0).toISOString()}
        onAcknowledge={onOneTimeSecretAcknowledge}
      />
    </Stack>
  );
};

export default Endpoints;
