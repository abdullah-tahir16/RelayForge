import TextField, { TextFieldProps } from '@mui/material/TextField';

export type AppTextFieldProps = TextFieldProps;

const AppTextField = (props: AppTextFieldProps) => {
  return <TextField size="small" fullWidth margin="dense" {...props} />;
};

export default AppTextField;
