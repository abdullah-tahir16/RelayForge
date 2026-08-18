import ProjectSwitcher from '../../components/ProjectSwitcher';
import { useProjectSwitcherFeature } from '../../hooks/ProjectSwitcher/useProjectSwitcherFeature';

const ProjectSwitcherContainer = () => {
  const { options, value, onChange } = useProjectSwitcherFeature();

  return <ProjectSwitcher options={options} value={value} onChange={onChange} />;
};

export default ProjectSwitcherContainer;
