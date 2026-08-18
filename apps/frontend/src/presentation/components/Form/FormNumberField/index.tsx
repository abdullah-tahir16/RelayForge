import { ChangeEvent } from 'react';
import { Field } from 'react-final-form';
import AppTextField from '../../App/AppTextField';

export interface FormNumberFieldProps {
  name: string;
  label: string;
}

const FormNumberField = ({ name, label }: FormNumberFieldProps) => {
  return (
    <Field name={name} type="number">
      {({ input, meta }) => (
        <AppTextField
          {...input}
          label={label}
          type="number"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            input.onChange(Number(event.target.value))
          }
          error={meta.touched && Boolean(meta.error)}
          helperText={meta.touched ? meta.error : undefined}
        />
      )}
    </Field>
  );
};

export default FormNumberField;
