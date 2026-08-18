import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { ReactNode } from 'react';

export interface AppDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

const AppDialog = ({ open, title, onClose, actions, children }: AppDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
};

export default AppDialog;
