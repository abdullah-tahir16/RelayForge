import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppButton from '../../App/AppButton';
import AppConfirmDialog from '../../App/AppConfirmDialog';
import AppKeyValueGrid from '../../App/AppKeyValueGrid';

export interface SigningSecretProps {
  version: number;
  rotatedAt: string;
  confirmationOpen: boolean;
  isRotating: boolean;
  onRequestRotate: () => void;
  onConfirmRotate: () => void;
  onCancelRotate: () => void;
}

const SigningSecret = ({
  version,
  rotatedAt,
  confirmationOpen,
  isRotating,
  onRequestRotate,
  onConfirmRotate,
  onCancelRotate,
}: SigningSecretProps) => {
  return (
    <Stack spacing={1.5} alignItems="flex-start">
      <AppKeyValueGrid
        items={[
          { label: 'Current version', value: version },
          { label: 'Issued', value: new Date(rotatedAt).toLocaleString() },
        ]}
      />
      <Typography variant="body2" color="text.secondary" maxWidth={680}>
        Existing endpoints were provisioned securely during migration. Rotate
        once to obtain a secret you can configure in your receiver. Active
        delivery runs may continue signing retries with their previous secret.
      </Typography>
      <AppButton
        color="error"
        variant="outlined"
        onClick={onRequestRotate}
        loading={isRotating}
        sx={{ minHeight: 44 }}
      >
        Rotate signing secret
      </AppButton>
      <AppConfirmDialog
        open={confirmationOpen}
        title="Rotate signing secret"
        description="New delivery runs will use a new secret immediately. Update your receiver and keep the previous secret through any active retry window. The new secret will be shown only once."
        confirmLabel="Rotate secret"
        loading={isRotating}
        onConfirm={onConfirmRotate}
        onCancel={onCancelRotate}
      />
    </Stack>
  );
};

export default SigningSecret;
