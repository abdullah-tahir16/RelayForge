import { Field } from 'react-final-form';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export interface FormCheckboxProps {
  name: string;
  label: string;
}

const FormCheckbox = ({ name, label }: FormCheckboxProps) => {
  return (
    <Field name={name} type="checkbox">
      {({ input }) => (
        <FormControlLabel
          control={<Checkbox {...input} checked={Boolean(input.checked)} />}
          label={label}
        />
      )}
    </Field>
  );
};

export default FormCheckbox;
