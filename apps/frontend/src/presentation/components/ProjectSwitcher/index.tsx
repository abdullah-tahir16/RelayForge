import AppSelect, { AppSelectOption } from '../App/AppSelect';

export interface ProjectSwitcherProps {
  options: AppSelectOption[];
  value: string;
  onChange: (projectId: string) => void;
}

const ProjectSwitcher = ({ options, value, onChange }: ProjectSwitcherProps) => {
  if (options.length === 0) {
    return null;
  }

  return (
    <AppSelect
      label="Project"
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 220 }}
    />
  );
};

export default ProjectSwitcher;
