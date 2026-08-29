import ProjectSwitcher from '../../components/ProjectSwitcher';
import { useProjectSwitcherFeature } from '../../hooks/ProjectSwitcher/useProjectSwitcherFeature';

const ProjectSwitcherContainer = () => {
  const { options, isLoading, value, onChange } = useProjectSwitcherFeature();

  return (
    <ProjectSwitcher
      options={options}
      isLoading={isLoading}
      value={value}
      onChange={onChange}
    />
  );
};

export default ProjectSwitcherContainer;
