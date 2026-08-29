import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Configuration from './Configuration';
import Subscriptions from './Subscriptions';
import { SubscribeFormValues } from './Subscriptions/Form/data';
import { Endpoint, SigningSecretRotated } from '../../../core/types/Endpoint';
import { Subscription } from '../../../core/types/Subscription';
import SigningSecret from './SigningSecret';
import OneTimeSecretDialog from '../SigningSecret';
import AppButton from '../App/AppButton';
import AppPageHeader from '../App/AppPageHeader';
import AppSurface from '../App/AppSurface';
import AppChip from '../App/AppChip';

export interface EndpointDetailProps {
  endpoint: Endpoint;
  subscriptions: Subscription[];
  onSubscribe: (values: SubscribeFormValues) => void;
  onUnsubscribe: (subscription: Subscription) => void;
  rotationConfirmationOpen: boolean;
  isRotating: boolean;
  isTesting: boolean;
  oneTimeSecret: SigningSecretRotated | null;
  onTestEndpoint: () => void;
  onRequestRotate: () => void;
  onConfirmRotate: () => void;
  onCancelRotate: () => void;
  onOneTimeSecretAcknowledge: () => void;
}

const EndpointDetail = ({
  endpoint,
  subscriptions,
  onSubscribe,
  onUnsubscribe,
  rotationConfirmationOpen,
  isRotating,
  isTesting,
  oneTimeSecret,
  onTestEndpoint,
  onRequestRotate,
  onConfirmRotate,
  onCancelRotate,
  onOneTimeSecretAcknowledge,
}: EndpointDetailProps) => {
  return (
    <Stack spacing={3}>
      <AppPageHeader
        eyebrow="Endpoint detail"
        title={endpoint.name}
        description="Verify receiver configuration, rotate signing secrets, send test deliveries, and manage event subscriptions."
        actions={
          <>
            <AppChip
              status={endpoint.enabled ? 'ENABLED' : 'DISABLED'}
              label={endpoint.enabled ? 'Enabled' : 'Disabled'}
            />
            <AppButton
              variant="outlined"
              onClick={onTestEndpoint}
              loading={isTesting}
            >
              Test delivery
            </AppButton>
          </>
        }
      />

      <AppSurface component="section" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          mb={1}
        >
          <Typography variant="subtitle1">Configuration</Typography>
        </Stack>
        <Configuration endpoint={endpoint} />
      </AppSurface>

      <AppSurface component="section" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="subtitle1" mb={1}>
          Signing Secret
        </Typography>
        <SigningSecret
          version={endpoint.signingSecretVersion}
          rotatedAt={endpoint.signingSecretRotatedAt}
          confirmationOpen={rotationConfirmationOpen}
          isRotating={isRotating}
          onRequestRotate={onRequestRotate}
          onConfirmRotate={onConfirmRotate}
          onCancelRotate={onCancelRotate}
        />
      </AppSurface>

      <OneTimeSecretDialog
        open={Boolean(oneTimeSecret)}
        secret={oneTimeSecret?.signingSecret ?? ''}
        version={oneTimeSecret?.version ?? endpoint.signingSecretVersion}
        rotatedAt={oneTimeSecret?.rotatedAt ?? endpoint.signingSecretRotatedAt}
        title="Save your rotated signing secret"
        onAcknowledge={onOneTimeSecretAcknowledge}
      />

      <AppSurface component="section" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="subtitle1" mb={1}>
          Subscriptions
        </Typography>
        <Subscriptions
          rows={subscriptions}
          onSubscribe={onSubscribe}
          onUnsubscribe={onUnsubscribe}
        />
      </AppSurface>
    </Stack>
  );
};

export default EndpointDetail;
