import { Form as FinalForm } from 'react-final-form';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormTextField from '../../Form/FormTextField';
import FormNumberField from '../../Form/FormNumberField';
import AppButton from '../../App/AppButton';
import AppDialog from '../../App/AppDialog';
import { endpointFormSchema, EndpointFormSchemaValues } from './data';
import { zodValidator } from '../../Form/fns';

export interface FormProps {
  open: boolean;
  title: string;
  initialValues?: Partial<EndpointFormSchemaValues>;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: EndpointFormSchemaValues) => void;
  onCancel: () => void;
}

const Form = ({
  open,
  title,
  initialValues,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel,
}: FormProps) => {
  return (
    <FinalForm<EndpointFormSchemaValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
      validate={zodValidator(endpointFormSchema)}
      render={({ handleSubmit }) => (
        <AppDialog
          open={open}
          title={title}
          onClose={onCancel}
          actions={
            <>
              <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <AppButton onClick={() => handleSubmit()} loading={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save endpoint'}
              </AppButton>
            </>
          }
        >
          <Stack spacing={2} mt={1} component="form" onSubmit={handleSubmit}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Use a public HTTPS receiver URL. RelayForge will sign deliveries
              and enforce the configured timeout per attempt.
            </Typography>
            <FormTextField name="name" label="Name" />
            <FormTextField name="url" label="URL" />
            <FormTextField name="description" label="Description" />
            <FormNumberField name="timeoutMs" label="Timeout (ms)" />
          </Stack>
        </AppDialog>
      )}
    />
  );
};

export default Form;
