import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetEndpoints } from '../../../infrastructure/hooks/Endpoint/useGetEndpoints';
import { useCreateEndpoint } from '../../../infrastructure/hooks/Endpoint/useCreateEndpoint';
import { useUpdateEndpoint } from '../../../infrastructure/hooks/Endpoint/useUpdateEndpoint';
import { useEnableEndpoint } from '../../../infrastructure/hooks/Endpoint/useEnableEndpoint';
import { useDisableEndpoint } from '../../../infrastructure/hooks/Endpoint/useDisableEndpoint';
import { useDeleteEndpoint } from '../../../infrastructure/hooks/Endpoint/useDeleteEndpoint';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { useToast } from '../../toast/useToast';
import { Endpoint, SigningSecretRotated } from '../../../core/types/Endpoint';
import { EndpointFormSchemaValues } from '../../components/Endpoints/Form/data';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './consts';

export function useEndpointsFeature() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedProjectId } = useProjectUseCase();
  const projectId = selectedProjectId ?? '';

  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Endpoint | null>(null);
  const [oneTimeSecret, setOneTimeSecret] =
    useState<SigningSecretRotated | null>(null);

  const endpointsQuery = useGetEndpoints(projectId, {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const createMutation = useCreateEndpoint(projectId);
  const updateMutation = useUpdateEndpoint(projectId);
  const enableMutation = useEnableEndpoint(projectId);
  const disableMutation = useDisableEndpoint(projectId);
  const deleteMutation = useDeleteEndpoint(projectId);

  function onCreateClick(): void {
    setEditingEndpoint(null);
    setIsFormOpen(true);
  }

  function onEditClick(endpoint: Endpoint): void {
    setEditingEndpoint(endpoint);
    setIsFormOpen(true);
  }

  function onFormCancel(): void {
    setIsFormOpen(false);
    setEditingEndpoint(null);
  }

  async function onFormSubmit(values: EndpointFormSchemaValues): Promise<void> {
    try {
      if (editingEndpoint) {
        await updateMutation.mutateAsync({
          endpointId: editingEndpoint.id,
          values,
        });
        toast.success('Endpoint updated');
      } else {
        const created = await createMutation.mutateAsync(values);
        setOneTimeSecret({
          signingSecret: created.signingSecret,
          version: created.signingSecretVersion,
          rotatedAt: created.signingSecretRotatedAt,
        });
        createMutation.reset();
        toast.success('Endpoint created');
      }
      setIsFormOpen(false);
      setEditingEndpoint(null);
    } catch {
      toast.error('Could not save endpoint');
    }
  }

  async function onToggleEnabled(endpoint: Endpoint): Promise<void> {
    try {
      if (endpoint.enabled) {
        await disableMutation.mutateAsync(endpoint.id);
        toast.success('Endpoint disabled');
      } else {
        await enableMutation.mutateAsync(endpoint.id);
        toast.success('Endpoint enabled');
      }
    } catch {
      toast.error('Could not update endpoint');
    }
  }

  async function onDeleteConfirm(): Promise<void> {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Endpoint deleted');
    } catch {
      toast.error('Could not delete endpoint');
    } finally {
      setDeleteTarget(null);
    }
  }

  function onRowClick(endpoint: Endpoint): void {
    navigate(`/endpoints/${endpoint.id}`);
  }

  return {
    rows: endpointsQuery.data?.items ?? [],
    isFormOpen,
    formTitle: editingEndpoint ? 'Edit endpoint' : 'New endpoint',
    formInitialValues: editingEndpoint
      ? {
          name: editingEndpoint.name,
          url: editingEndpoint.url,
          description: editingEndpoint.description ?? undefined,
          timeoutMs: editingEndpoint.timeoutMs,
        }
      : undefined,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    deleteTarget,
    oneTimeSecret,
    onRowClick,
    onCreateClick,
    onEditClick,
    onFormSubmit,
    onFormCancel,
    onToggleEnabled,
    onDeleteClick: setDeleteTarget,
    onDeleteConfirm,
    onDeleteCancel: () => setDeleteTarget(null),
    onOneTimeSecretAcknowledge: () => setOneTimeSecret(null),
  };
}
