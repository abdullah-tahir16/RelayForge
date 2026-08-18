import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppChip from '../../App/AppChip';
import { Endpoint } from '../../../../core/types/Endpoint';

export interface ConfigurationProps {
  endpoint: Endpoint;
}

const Configuration = ({ endpoint }: ConfigurationProps) => {
  return (
    <Stack spacing={1}>
      <Typography variant="body2">
        <strong>URL:</strong> {endpoint.url}
      </Typography>
      {endpoint.description && (
        <Typography variant="body2">
          <strong>Description:</strong> {endpoint.description}
        </Typography>
      )}
      <Typography variant="body2">
        <strong>Timeout:</strong> {endpoint.timeoutMs}ms
      </Typography>
      <AppChip
        status={endpoint.enabled ? 'ENABLED' : 'DISABLED'}
        label={endpoint.enabled ? 'Enabled' : 'Disabled'}
        sx={{ width: 'fit-content' }}
      />
    </Stack>
  );
};

export default Configuration;
