import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppButton from '../../App/AppButton';
import AppConfirmDialog from '../../App/AppConfirmDialog';

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
      <Typography variant="body2">Current version: {version}</Typography>
      <Typography variant="body2">
        Issued: {new Date(rotatedAt).toLocaleString()}
      </Typography>
      <Typography variant="body2" color="text.secondary" maxWidth={680}>
        Existing endpoints were provisioned securely during migration. Rotate
        once to obtain a secret you can configure in your receiver. Active
        delivery runs may continue signing retries with their previous secret.
      </Typography>
      <AppButton
        color="error"
        onClick={onRequestRotate}
        disabled={isRotating}
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
