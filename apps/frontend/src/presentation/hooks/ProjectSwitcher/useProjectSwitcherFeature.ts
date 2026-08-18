import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';

export function useProjectSwitcherFeature() {
  const { projects, selectedProjectId, selectProject } = useProjectUseCase();

  const options = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  return {
    options,
    value: selectedProjectId ?? '',
    onChange: selectProject,
  };
}
