import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';
import AppSurface from '../AppSurface';

export interface AppKeyValueItem {
  label: string;
  value: ReactNode;
}

export interface AppKeyValueGridProps {
  items: AppKeyValueItem[];
}

const AppKeyValueGrid = ({ items }: AppKeyValueGridProps) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        lg: 'repeat(4, minmax(0, 1fr))',
      }}
      gap={1.5}
    >
      {items.map((item) => (
        <AppSurface key={item.label} tone="recessed" sx={{ p: 2 }}>
          <Typography variant="caption" textTransform="uppercase" fontWeight={800}>
            {item.label}
          </Typography>
          <Box mt={0.75} sx={{ overflowWrap: 'anywhere' }}>
            {item.value}
          </Box>
        </AppSurface>
      ))}
    </Box>
  );
};

export default AppKeyValueGrid;
