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
      <Typography variant="h5">{endpoint.name}</Typography>

      <section>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          mb={1}
        >
          <Typography variant="subtitle1">Configuration</Typography>
          <AppButton
            variant="outlined"
            onClick={onTestEndpoint}
            disabled={isTesting}
          >
            Test delivery
          </AppButton>
        </Stack>
        <Configuration endpoint={endpoint} />
      </section>

      <section>
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
      </section>

      <OneTimeSecretDialog
        open={Boolean(oneTimeSecret)}
        secret={oneTimeSecret?.signingSecret ?? ''}
        version={oneTimeSecret?.version ?? endpoint.signingSecretVersion}
        rotatedAt={oneTimeSecret?.rotatedAt ?? endpoint.signingSecretRotatedAt}
        title="Save your rotated signing secret"
        onAcknowledge={onOneTimeSecretAcknowledge}
      />

      <section>
        <Typography variant="subtitle1" mb={1}>
          Subscriptions
        </Typography>
        <Subscriptions
          rows={subscriptions}
          onSubscribe={onSubscribe}
          onUnsubscribe={onUnsubscribe}
        />
      </section>
    </Stack>
  );
};

export default EndpointDetail;
