import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { ReactNode } from 'react';
import { relayForgeTokens } from '../../../../theme/theme';

export interface AppCodeBlockProps {
  children: ReactNode;
  maxHeight?: number;
  ariaLabel?: string;
}

const AppCodeBlock = ({
  children,
  maxHeight = 420,
  ariaLabel,
}: AppCodeBlockProps) => {
  return (
    <Box
      component="pre"
      aria-label={ariaLabel}
      sx={{
        m: 0,
        p: { xs: 2, sm: 2.5 },
        border: 1,
        borderColor: alpha(relayForgeTokens.color.info, 0.24),
        borderRadius: 3,
        bgcolor: alpha(relayForgeTokens.color.surfaceRecessed, 0.92),
        color: relayForgeTokens.color.text,
        overflow: 'auto',
        maxHeight,
        fontFamily: relayForgeTokens.font.mono,
        fontSize: 13,
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        boxShadow: `inset 0 0 0 1px ${alpha(relayForgeTokens.color.borderStrong, 0.12)}`,
      }}
    >
      {children}
    </Box>
  );
};

export default AppCodeBlock;
