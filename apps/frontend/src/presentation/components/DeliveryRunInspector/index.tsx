import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  DeliveryAttempt,
  DeliveryRun,
} from '../../../core/types/Delivery';
import AppChip from '../App/AppChip';
import AppLoader from '../App/AppLoader';

export interface DeliveryRunInspectorProps {
  runs: DeliveryRun[];
  attempts: DeliveryAttempt[];
  isLoading: boolean;
  isError: boolean;
}

const DeliveryRunInspector = ({
  runs,
  attempts,
  isLoading,
  isError,
}: DeliveryRunInspectorProps) => {
  if (isLoading) return <AppLoader />;
  if (isError) {
    return (
      <Alert severity="error" role="alert">
        Run history could not be loaded. Try inspecting the delivery again.
      </Alert>
    );
  }
  if (runs.length === 0) {
    return <Alert severity="info">No delivery runs have been recorded yet.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {runs.map((run) => {
        const runAttempts = attempts.filter((attempt) => attempt.runId === run.id);
        return (
          <Paper key={run.id} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
              >
                <Typography variant="subtitle2">
                  Run {run.runNumber} · {run.trigger === 'INITIAL' ? 'Initial' : 'Manual replay'}
                </Typography>
                <AppChip status={run.status} label={run.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {run.requestedBy
                  ? `Requested by ${run.requestedBy.email}`
                  : run.trigger === 'MANUAL'
                    ? 'Requesting user is no longer available'
                    : 'Created by event routing'}
                {' · '}
                {run.attemptCount}/{run.attemptLimit ?? '—'} attempts
                {' · '}
                Created {new Date(run.createdAt).toLocaleString()}
              </Typography>
              {run.deadLetteredAt && (
                <Typography variant="body2" color="error.main">
                  Dead-lettered {new Date(run.deadLetteredAt).toLocaleString()}
                </Typography>
              )}

              {runAttempts.length === 0 ? (
                <Alert severity="info">
                  This run has no attempts yet{run.initialJobPublishedAt ? '.' : ' because its first job is unpublished.'}
                </Alert>
              ) : (
                <Stack spacing={1}>
                  {runAttempts.map((attempt) => (
                    <Box
                      key={attempt.id}
                      sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        Run attempt {attempt.runAttemptNumber} · Global attempt {attempt.attemptNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(attempt.startedAt).toLocaleString()} ·{' '}
                        {attempt.responseStatus !== null
                          ? `HTTP ${attempt.responseStatus}`
                          : attempt.errorCode ?? 'Processing'}
                        {' · '}
                        {attempt.durationMs !== null ? `${attempt.durationMs}ms` : 'In progress'}
                      </Typography>
                      {attempt.errorMessage && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {attempt.errorMessage}
                        </Alert>
                      )}
                      {attempt.responseBodyPreview !== null && (
                        <Typography
                          component="pre"
                          variant="body2"
                          sx={{ mt: 1, mb: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                        >
                          {attempt.responseBodyPreview || '(empty response body)'}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default DeliveryRunInspector;
