import MenuItem from '@mui/material/MenuItem';
import TextField, { TextFieldProps } from '@mui/material/TextField';

export interface AppSelectOption {
  value: string;
  label: string;
}

export interface AppSelectProps extends Omit<TextFieldProps, 'select'> {
  options: AppSelectOption[];
}

const AppSelect = ({ options, ...props }: AppSelectProps) => {
  return (
    <TextField select size="small" fullWidth {...props}>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default AppSelect;
