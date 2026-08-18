import Endpoints from '../../components/Endpoints';
import { useEndpointsFeature } from '../../hooks/Endpoints/useEndpointsFeature';

const EndpointsContainer = () => {
  const feature = useEndpointsFeature();

  return (
    <Endpoints
      rows={feature.rows}
      onRowClick={feature.onRowClick}
      onToggleEnabled={feature.onToggleEnabled}
      isFormOpen={feature.isFormOpen}
      formTitle={feature.formTitle}
      formInitialValues={feature.formInitialValues}
      isSubmitting={feature.isSubmitting}
      onCreateClick={feature.onCreateClick}
      onEditClick={feature.onEditClick}
      onFormSubmit={feature.onFormSubmit}
      onFormCancel={feature.onFormCancel}
      deleteTarget={feature.deleteTarget}
      onDeleteClick={feature.onDeleteClick}
      onDeleteConfirm={feature.onDeleteConfirm}
      onDeleteCancel={feature.onDeleteCancel}
    />
  );
};

export default EndpointsContainer;
