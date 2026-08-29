import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AppButton from '../../App/AppButton';
import AppCodeBlock from '../../App/AppCodeBlock';
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={isRawView ? 'raw' : 'pretty'}
          aria-label="Payload view mode"
          onChange={(_event, value) => value && onToggleRawView(value === 'raw')}
        >
          <ToggleButton value="pretty" aria-label="Show formatted payload">
            Pretty
          </ToggleButton>
          <ToggleButton value="raw" aria-label="Show raw payload">
            Raw
          </ToggleButton>
        </ToggleButtonGroup>
        <AppButton size="small" variant="outlined" onClick={onCopy}>
          Copy
        </AppButton>
      </Stack>
      <AppCodeBlock ariaLabel="Event payload">{text}</AppCodeBlock>
    </Stack>
  );
};

export default Payload;
