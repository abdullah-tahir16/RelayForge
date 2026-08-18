import { createContext, ReactNode, useContext, useState } from 'react';
import { getStoredProjectId, storeProjectId } from '../../api/projectSelection';

interface ProjectContextValue {
  selectedProjectId: string | null;
  selectProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

export interface ProjectProviderProps {
  children: ReactNode;
}

const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    getStoredProjectId(),
  );

  function selectProject(projectId: string): void {
    storeProjectId(projectId);
    setSelectedProjectId(projectId);
  }

  return (
    <ProjectContext.Provider value={{ selectedProjectId, selectProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}

export default ProjectProvider;
