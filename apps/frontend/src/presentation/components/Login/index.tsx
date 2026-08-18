import { Form } from 'react-final-form';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormTextField from '../Form/FormTextField';
import AppButton from '../App/AppButton';
import { loginSchema, LoginFormValues } from './data';
import { zodValidator } from '../Form/fns';

export interface LoginProps {
  onSubmit: (values: LoginFormValues) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

const Login = ({ onSubmit, isSubmitting, errorMessage }: LoginProps) => {
  return (
    <Stack minHeight="100vh" alignItems="center" justifyContent="center" p={2}>
      <Paper variant="outlined" sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" mb={3}>
          RelayForge
        </Typography>
        <Form<LoginFormValues>
          onSubmit={onSubmit}
          validate={zodValidator(loginSchema)}
          render={({ handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                <FormTextField name="email" label="Email" />
                <FormTextField name="password" label="Password" type="password" />
                <AppButton type="submit" disabled={isSubmitting} fullWidth>
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </AppButton>
              </Stack>
            </form>
          )}
        />
      </Paper>
    </Stack>
  );
};

export default Login;
