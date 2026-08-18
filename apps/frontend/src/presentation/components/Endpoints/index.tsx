import Header from './Header';
import Table from './Table';
import Form from './Form';
import { EndpointFormSchemaValues } from './Form/data';
import AppConfirmDialog from '../App/AppConfirmDialog';
import { Endpoint } from '../../../core/types/Endpoint';

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
}: EndpointsProps) => {
  return (
    <div>
      <Header onCreateClick={onCreateClick} />
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
    </div>
  );
};

export default Endpoints;
