import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DeliveryAttempt } from '../../../../core/types/Delivery';
import AppCodeBlock from '../../App/AppCodeBlock';
import AppLoader from '../../App/AppLoader';
import AppSurface from '../../App/AppSurface';

export interface DeliveryAttemptsProps {
  attempts: DeliveryAttempt[];
  isLoading: boolean;
  isError: boolean;
}

const DeliveryAttempts = ({ attempts, isLoading, isError }: DeliveryAttemptsProps) => {
  if (isLoading) return <AppLoader />;
  if (isError) return <Alert severity="error">Attempt history could not be loaded.</Alert>;
  if (attempts.length === 0) {
    return <Alert severity="info">No attempts have been recorded yet.</Alert>;
  }

  return (
    <Stack spacing={1.5}>
      {attempts.map((attempt) => (
        <AppSurface key={attempt.id} tone="recessed" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Attempt {attempt.attemptNumber} ·{' '}
              {attempt.responseStatus !== null
                ? `HTTP ${attempt.responseStatus}`
                : attempt.errorCode ?? 'Processing'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(attempt.startedAt).toLocaleString()} ·{' '}
              {attempt.durationMs !== null ? `${attempt.durationMs}ms` : 'In progress'}
            </Typography>
            {attempt.errorMessage && (
              <Alert severity="error">{attempt.errorMessage}</Alert>
            )}
            {attempt.responseBodyPreview !== null && (
              <AppCodeBlock maxHeight={180} ariaLabel="Response body preview">
                {attempt.responseBodyPreview || '(empty response body)'}
              </AppCodeBlock>
            )}
            <AppCodeBlock maxHeight={220} ariaLabel="Attempt headers">
              {JSON.stringify(
                {
                  requestHeaders: attempt.requestHeaders,
                  responseHeaders: attempt.responseHeaders,
                },
                null,
                2,
              )}
            </AppCodeBlock>
          </Stack>
        </AppSurface>
      ))}
    </Stack>
  );
};

export default DeliveryAttempts;
