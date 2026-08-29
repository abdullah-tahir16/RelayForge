import { Form } from 'react-final-form';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import FormTextField from '../Form/FormTextField';
import AppButton from '../App/AppButton';
import AppSurface from '../App/AppSurface';
import { loginSchema, LoginFormValues } from './data';
import { zodValidator } from '../Form/fns';
import { relayForgeTokens } from '../../../theme/theme';

export interface LoginProps {
  onSubmit: (values: LoginFormValues) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

const Login = ({ onSubmit, isSubmitting, errorMessage }: LoginProps) => {
  return (
    <Stack
      minHeight="100dvh"
      alignItems="center"
      justifyContent="center"
      p={2}
      sx={{
        background:
          `radial-gradient(circle at 18% 12%, ${alpha(relayForgeTokens.color.accent, 0.16)} 0, transparent 24rem), ` +
          `radial-gradient(circle at 82% 18%, ${alpha(relayForgeTokens.color.info, 0.14)} 0, transparent 22rem)`,
      }}
    >
      <AppSurface tone="raised" sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 440 }}>
        <Box mb={3}>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            Webhook control plane
          </Typography>
          <Typography component="h1" variant="h4">
            RelayForge
          </Typography>
          <Typography color="text.secondary" mt={1}>
            Sign in to inspect events, deliveries, endpoints, and recovery
            operations.
          </Typography>
        </Box>
        <Form<LoginFormValues>
          onSubmit={onSubmit}
          validate={zodValidator(loginSchema)}
          render={({ handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                <FormTextField name="email" label="Email" />
                <FormTextField name="password" label="Password" type="password" />
                <AppButton type="submit" loading={isSubmitting} fullWidth>
                  Sign in
                </AppButton>
              </Stack>
            </form>
          )}
        />
      </AppSurface>
    </Stack>
  );
};

export default Login;
