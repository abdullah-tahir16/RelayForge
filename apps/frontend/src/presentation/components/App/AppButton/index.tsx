import Button, { ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

const AppButton = ({
  loading = false,
  disabled,
  children,
  startIcon,
  ...props
}: AppButtonProps) => {
  return (
    <Button
      variant="contained"
      disableElevation
      disabled={disabled || loading}
      startIcon={
        loading ? <CircularProgress color="inherit" size={16} /> : startIcon
      }
      {...props}
    >
      {children}
    </Button>
  );
};

export default AppButton;
