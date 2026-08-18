import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AppButton from '../../App/AppButton';
import { formatPayloadPretty, formatPayloadRaw } from './fns';

export interface PayloadProps {
  payload: Record<string, unknown>;
  isRawView: boolean;
  onToggleRawView: (isRawView: boolean) => void;
  onCopy: () => void;
}

const Payload = ({ payload, isRawView, onToggleRawView, onCopy }: PayloadProps) => {
  const text = isRawView ? formatPayloadRaw(payload) : formatPayloadPretty(payload);

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={isRawView ? 'raw' : 'pretty'}
          onChange={(_event, value) => value && onToggleRawView(value === 'raw')}
        >
          <ToggleButton value="pretty">Pretty</ToggleButton>
          <ToggleButton value="raw">Raw</ToggleButton>
        </ToggleButtonGroup>
        <AppButton size="small" onClick={onCopy}>
          Copy
        </AppButton>
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 400,
          fontSize: 13,
        }}
      >
        {text}
      </Box>
    </Stack>
  );
};

export default Payload;
