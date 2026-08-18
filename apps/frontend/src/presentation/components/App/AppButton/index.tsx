import Button, { ButtonProps } from '@mui/material/Button';

export interface AppButtonProps extends ButtonProps {}

const AppButton = (props: AppButtonProps) => {
  return <Button variant="contained" disableElevation {...props} />;
};

export default AppButton;
