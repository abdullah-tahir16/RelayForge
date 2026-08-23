import { ChipProps } from '@mui/material/Chip';

export const STATUS_CHIP_COLOR: Record<string, ChipProps['color']> = {
  ACCEPTED: 'default',
  PUBLISHED: 'info',
  PROCESSING: 'info',
  COMPLETED: 'success',
  PARTIALLY_FAILED: 'warning',
  FAILED: 'error',
  DEAD_LETTERED: 'error',
  PENDING: 'default',
  RETRYING: 'warning',
  SUCCEEDED: 'success',
  DISABLED: 'default',
  ENABLED: 'success',
};
