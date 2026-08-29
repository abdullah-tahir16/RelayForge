import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppChip from '../../App/AppChip';
import AppCodeBlock from '../../App/AppCodeBlock';
import AppKeyValueGrid from '../../App/AppKeyValueGrid';
import { Endpoint } from '../../../../core/types/Endpoint';

export interface ConfigurationProps {
  endpoint: Endpoint;
}

const Configuration = ({ endpoint }: ConfigurationProps) => {
  return (
    <Stack spacing={2}>
      <AppKeyValueGrid
        items={[
          {
            label: 'Status',
            value: (
              <AppChip
                status={endpoint.enabled ? 'ENABLED' : 'DISABLED'}
                label={endpoint.enabled ? 'Enabled' : 'Disabled'}
              />
            ),
          },
          { label: 'Timeout', value: `${endpoint.timeoutMs}ms` },
          { label: 'Secret version', value: endpoint.signingSecretVersion },
          {
            label: 'Rotated',
            value: new Date(endpoint.signingSecretRotatedAt).toLocaleString(),
          },
        ]}
      />
      <div>
        <Typography variant="caption" textTransform="uppercase" fontWeight={800}>
          Receiver URL
        </Typography>
        <AppCodeBlock maxHeight={140} ariaLabel="Endpoint receiver URL">
          {endpoint.url}
        </AppCodeBlock>
      </div>
      {endpoint.description && (
        <Typography variant="body2" color="text.secondary">
          {endpoint.description}
        </Typography>
      )}
    </Stack>
  );
};

export default Configuration;
