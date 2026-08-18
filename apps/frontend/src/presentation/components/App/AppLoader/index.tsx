import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export interface AppLoaderProps {
  size?: number;
}

const AppLoader = ({ size = 28 }: AppLoaderProps) => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" p={4}>
      <CircularProgress size={size} />
    </Box>
  );
};

export default AppLoader;
