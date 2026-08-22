import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DeliveryAttempt } from '../../../../core/types/Delivery';
import AppLoader from '../../App/AppLoader';

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
        <Paper key={attempt.id} variant="outlined" sx={{ p: 2, minWidth: 0 }}>
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
              <Typography
                component="pre"
                variant="body2"
                sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                {attempt.responseBodyPreview || '(empty response body)'}
              </Typography>
            )}
            <Typography
              component="pre"
              variant="caption"
              color="text.secondary"
              sx={{ m: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {JSON.stringify(
                {
                  requestHeaders: attempt.requestHeaders,
                  responseHeaders: attempt.responseHeaders,
                },
                null,
                2,
              )}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default DeliveryAttempts;
