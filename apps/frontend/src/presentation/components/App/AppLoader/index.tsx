import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AppSurface from '../AppSurface';

export interface AppLoaderProps {
  size?: number;
}

const AppLoader = ({ size = 28 }: AppLoaderProps) => {
  return (
    <AppSurface tone="recessed" sx={{ p: 4 }}>
      <Box display="flex" justifyContent="center" alignItems="center" gap={1.5}>
        <CircularProgress size={size} />
        <Typography color="text.secondary">Loading operational state...</Typography>
      </Box>
    </AppSurface>
  );
};

export default AppLoader;
