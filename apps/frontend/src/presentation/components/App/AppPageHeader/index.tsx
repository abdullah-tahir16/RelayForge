import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

export interface AppPageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
}

const AppPageHeader = ({
  title,
  eyebrow,
  description,
  actions,
}: AppPageHeaderProps) => {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'center' }}
      spacing={2.5}
      sx={{ position: 'relative', zIndex: 1 }}
    >
      <Box minWidth={0}>
        {eyebrow && (
          <Typography
            variant="overline"
            color="primary.main"
            fontWeight={800}
            letterSpacing="0.16em"
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          variant="h4"
          fontWeight={800}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body1"
            color="text.secondary"
            mt={0.75}
            maxWidth={760}
          >
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
          flexShrink={0}
          sx={{ '& > *': { flexShrink: 0 } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
};

export default AppPageHeader;
