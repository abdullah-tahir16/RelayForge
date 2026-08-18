import { Field } from 'react-final-form';
import AppTextField from '../../App/AppTextField';

export interface FormTextFieldProps {
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
}

const FormTextField = ({
  name,
  label,
  type = 'text',
  multiline,
  rows,
}: FormTextFieldProps) => {
  return (
    <Field name={name}>
      {({ input, meta }) => (
        <AppTextField
          {...input}
          label={label}
          type={type}
          multiline={multiline}
          rows={rows}
          error={meta.touched && Boolean(meta.error)}
          helperText={meta.touched ? meta.error : undefined}
        />
      )}
    </Field>
  );
};

export default FormTextField;
