import { Form as FinalForm } from 'react-final-form';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormTextField from '../../../Form/FormTextField';
import AppButton from '../../../App/AppButton';
import { subscribeFormSchema, SubscribeFormValues } from './data';
import { zodValidator } from '../../../Form/fns';

export interface FormProps {
  onSubmit: (values: SubscribeFormValues) => void;
}

const Form = ({ onSubmit }: FormProps) => {
  return (
    <FinalForm<SubscribeFormValues>
      onSubmit={(values, form) => {
        onSubmit(values);
        form.restart();
      }}
      validate={zodValidator(subscribeFormSchema)}
      render={({ handleSubmit }) => (
        <Stack spacing={1.5} component="form" onSubmit={handleSubmit}>
          <Typography variant="body2" color="text.secondary">
            Subscribe this endpoint to exact event names or wildcard patterns.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <FormTextField name="eventPattern" label="Event pattern (e.g. order.*)" />
          <AppButton type="submit">Subscribe</AppButton>
          </Stack>
        </Stack>
      )}
    />
  );
};

export default Form;
