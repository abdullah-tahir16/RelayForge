import TextField, { TextFieldProps } from '@mui/material/TextField';

export type AppTextFieldProps = TextFieldProps;

const AppTextField = (props: AppTextFieldProps) => {
  return <TextField size="small" fullWidth {...props} />;
};

export default AppTextField;
