import { useEffect } from 'react';
import { useGetProjects } from '../../hooks/Project/useGetProjects';
import { useProjectContext } from './ProjectProvider';

export function useProjectUseCase() {
  const { selectedProjectId, selectProject } = useProjectContext();
  const projectsQuery = useGetProjects({ page: 1, pageSize: 100 });
  const projects = projectsQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [selectedProjectId, projects, selectProject]);

  const currentProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  return {
    projects,
    isLoading: projectsQuery.isLoading,
    selectedProjectId,
    currentProject,
    selectProject,
  };
}
