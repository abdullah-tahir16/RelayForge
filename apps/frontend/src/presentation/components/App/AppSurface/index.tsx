import Paper, { PaperProps } from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import { ReactNode } from 'react';
import { relayForgeTokens } from '../../../../theme/theme';

export interface AppSurfaceProps extends PaperProps {
  children: ReactNode;
  tone?: 'default' | 'raised' | 'recessed' | 'danger';
}

const toneStyles = {
  default: {
    background: relayForgeTokens.color.surface,
    borderColor: alpha(relayForgeTokens.color.borderStrong, 0.5),
  },
  raised: {
    background: relayForgeTokens.color.surfaceRaised,
    borderColor: alpha(relayForgeTokens.color.borderStrong, 0.56),
  },
  recessed: {
    background: alpha(relayForgeTokens.color.surfaceRaised, 0.72),
    borderColor: alpha(relayForgeTokens.color.borderStrong, 0.48),
  },
  danger: {
    background: alpha(relayForgeTokens.color.danger, 0.06),
    borderColor: alpha(relayForgeTokens.color.danger, 0.38),
  },
};

const AppSurface = ({
  children,
  tone = 'default',
  sx,
  ...props
}: AppSurfaceProps) => {
  return (
    <Paper
      variant="outlined"
      {...props}
      sx={{
        position: 'relative',
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: 'none',
        ...toneStyles[tone],
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
};

export default AppSurface;
