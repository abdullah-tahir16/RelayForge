import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

export interface AppEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

const AppEmptyState = ({ title, description, action }: AppEmptyStateProps) => {
  return (
    <Box
      textAlign="center"
      px={{ xs: 2, sm: 4 }}
      py={{ xs: 5, sm: 7 }}
      role="status"
    >
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography color="text.secondary" mt={0.75} maxWidth={460} mx="auto">
          {description}
        </Typography>
      )}
      {action && <Box mt={2}>{action}</Box>}
    </Box>
  );
};

export default AppEmptyState;
