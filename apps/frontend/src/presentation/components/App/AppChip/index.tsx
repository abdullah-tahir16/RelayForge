import Chip, { ChipProps } from '@mui/material/Chip';
import { STATUS_CHIP_COLOR } from './consts';

export interface AppChipProps extends Omit<ChipProps, 'color'> {
  status?: string;
}

const AppChip = ({ status, ...props }: AppChipProps) => {
  const color = status ? STATUS_CHIP_COLOR[status] ?? 'default' : 'default';
  return <Chip size="small" color={color} {...props} />;
};

export default AppChip;
