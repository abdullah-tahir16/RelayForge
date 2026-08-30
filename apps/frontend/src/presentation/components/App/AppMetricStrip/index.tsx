import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ReactNode } from 'react';
import { relayForgeTokens } from '../../../../theme/theme';

export interface AppMetric {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  tone?: 'neutral' | 'accent' | 'info' | 'warning' | 'danger';
}

export interface AppMetricStripProps {
  metrics: AppMetric[];
}

const toneColor: Record<NonNullable<AppMetric['tone']>, string> = {
  neutral: relayForgeTokens.color.textMuted,
  accent: relayForgeTokens.color.accent,
  info: relayForgeTokens.color.info,
  warning: relayForgeTokens.color.warning,
  danger: relayForgeTokens.color.danger,
};

const AppMetricStrip = ({ metrics }: AppMetricStripProps) => {
  return (
    <Box
      display="grid"
      gap={1.5}
      gridTemplateColumns={{
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        lg: `repeat(${Math.min(metrics.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {metrics.map((metric) => {
        const color = toneColor[metric.tone ?? 'neutral'];

        return (
          <Stack
            key={metric.label}
            spacing={1}
            sx={{
              minWidth: 0,
              p: { xs: 2, sm: 2.25 },
              border: 1,
              borderColor: alpha(relayForgeTokens.color.borderStrong, 0.4),
              borderRadius: '8px',
              bgcolor: relayForgeTokens.color.surface,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                aria-hidden
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: color,
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={800}
                textTransform="uppercase"
                letterSpacing="0.08em"
              >
                {metric.label}
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.04em">
              {metric.value}
            </Typography>
            {metric.helper && (
              <Typography variant="body2" color="text.secondary">
                {metric.helper}
              </Typography>
            )}
          </Stack>
        );
      })}
    </Box>
  );
};

export default AppMetricStrip;
