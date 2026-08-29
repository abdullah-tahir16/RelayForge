import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AppButton from '../App/AppButton';
import AppCodeBlock from '../App/AppCodeBlock';
import AppDialog from '../App/AppDialog';

export interface OneTimeSecretDialogProps {
  open: boolean;
  secret: string;
  version: number;
  rotatedAt: string;
  title?: string;
  onAcknowledge: () => void;
}

const OneTimeSecretDialog = ({
  open,
  secret,
  version,
  rotatedAt,
  title = 'Save your signing secret',
  onAcknowledge,
}: OneTimeSecretDialogProps) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );

  useEffect(() => setCopyStatus('idle'), [secret]);

  async function copySecret(): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <AppDialog
      open={open}
      title={title}
      onClose={() => undefined}
      dismissible={false}
      actions={
        <AppButton onClick={onAcknowledge} sx={{ minHeight: 44 }}>
          I’ve saved this secret
        </AppButton>
      }
    >
      <Stack spacing={2} mt={1}>
        <Alert severity="warning">
          This secret is shown once. Store it securely before closing this
          dialog; RelayForge cannot reveal it again.
        </Alert>
        <Typography variant="body2">
          Secret version {version} · issued{' '}
          {new Date(rotatedAt).toLocaleString()}
        </Typography>
        <AppCodeBlock maxHeight={180} ariaLabel="Signing secret">
          {secret}
        </AppCodeBlock>
        <AppButton
          onClick={copySecret}
          startIcon={<ContentCopyIcon />}
          aria-label="Copy signing secret"
          sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        >
          Copy secret
        </AppButton>
        <Typography role="status" variant="body2" minHeight="1.5em">
          {copyStatus === 'copied' && 'Copied to clipboard.'}
          {copyStatus === 'error' &&
            'Copy failed. Select the secret and copy it manually.'}
        </Typography>
      </Stack>
    </AppDialog>
  );
};

export default OneTimeSecretDialog;
