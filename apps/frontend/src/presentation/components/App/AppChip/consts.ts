import { ChipProps } from '@mui/material/Chip';

export const STATUS_CHIP_COLOR: Record<string, ChipProps['color']> = {
  ACCEPTED: 'default',
  PUBLISHED: 'info',
  PROCESSING: 'info',
  COMPLETED: 'success',
  PARTIALLY_FAILED: 'warning',
  FAILED: 'error',
  PENDING: 'default',
  SUCCEEDED: 'success',
  DISABLED: 'default',
  ENABLED: 'success',
};
