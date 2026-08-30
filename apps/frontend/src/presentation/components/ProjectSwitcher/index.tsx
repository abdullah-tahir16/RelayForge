import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AppSelect, { AppSelectOption } from '../App/AppSelect';
import AppSkeleton from '../App/AppSkeleton';

export interface ProjectSwitcherProps {
  options: AppSelectOption[];
  isLoading?: boolean;
  value: string;
  onChange: (projectId: string) => void;
}

const ProjectSwitcher = ({
  options,
  isLoading = false,
  value,
  onChange,
}: ProjectSwitcherProps) => {
  if (isLoading) {
    return <AppSkeleton width={240} height={46} aria-label="Loading projects" />;
  }

  if (options.length === 0) {
    return (
      <Box
        px={1.5}
        py={1}
        border={1}
        borderColor="divider"
        borderRadius={3}
      >
        <Typography variant="caption" color="text.secondary">
          No projects available
        </Typography>
      </Box>
    );
  }

  return (
    <AppSelect
      label="Project"
      options={options}
      value={value}
      margin="none"
      onChange={(event) => onChange(event.target.value)}
      sx={{
        width: { xs: '100%', sm: 220 },
        '& .MuiOutlinedInput-root': {
          height: 44,
          bgcolor: 'background.paper',
        },
      }}
    />
  );
};

export default ProjectSwitcher;
