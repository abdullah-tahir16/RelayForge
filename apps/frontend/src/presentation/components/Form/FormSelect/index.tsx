import { Field } from 'react-final-form';
import AppSelect, { AppSelectOption } from '../../App/AppSelect';

export interface FormSelectProps {
  name: string;
  label: string;
  options: AppSelectOption[];
}

const FormSelect = ({ name, label, options }: FormSelectProps) => {
  return (
    <Field name={name}>
      {({ input, meta }) => (
        <AppSelect
          {...input}
          label={label}
          options={options}
          error={meta.touched && Boolean(meta.error)}
          helperText={meta.touched ? meta.error : undefined}
        />
      )}
    </Field>
  );
};

export default FormSelect;
