import Box from '@mui/material/Box';
import Chip, { ChipProps } from '@mui/material/Chip';
import { DEFAULT_STATUS_CHIP_TONE, STATUS_CHIP_TONE } from './consts';

export interface AppChipProps extends Omit<ChipProps, 'color'> {
  status?: string;
}

const AppChip = ({ status, label, sx, ...props }: AppChipProps) => {
  const tone = status
    ? STATUS_CHIP_TONE[status] ?? DEFAULT_STATUS_CHIP_TONE
    : DEFAULT_STATUS_CHIP_TONE;
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      icon={
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: tone.dot,
            boxShadow: `0 0 0 2px ${tone.bg}`,
          }}
        />
      }
      sx={{
        borderColor: tone.border,
        bgcolor: tone.bg,
        color: tone.fg,
        height: 24,
        borderRadius: 1.5,
        fontWeight: 800,
        letterSpacing: '0.035em',
        textTransform: 'uppercase',
        '& .MuiChip-icon': {
          ml: 1.1,
          mr: -0.35,
          color: tone.dot,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default AppChip;
