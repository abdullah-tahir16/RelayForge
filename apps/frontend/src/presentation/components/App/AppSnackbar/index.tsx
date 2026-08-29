import Snackbar from '@mui/material/Snackbar';
import Alert, { AlertColor } from '@mui/material/Alert';

export interface AppSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
}

const AppSnackbar = ({ open, message, severity, onClose }: AppSnackbarProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        role="status"
        sx={{ borderRadius: 3, boxShadow: 8 }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;
