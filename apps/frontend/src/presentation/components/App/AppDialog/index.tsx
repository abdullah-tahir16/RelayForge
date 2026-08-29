import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import { relayForgeTokens } from '../../../../theme/theme';

export interface AppDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
}

const AppDialog = ({
  open,
  title,
  onClose,
  actions,
  children,
  dismissible = true,
}: AppDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={dismissible ? onClose : undefined}
      disableEscapeKeyDown={!dismissible}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent
        sx={{
          color: 'text.secondary',
          borderTop: `1px solid ${alpha(relayForgeTokens.color.borderStrong, 0.36)}`,
          pt: 2,
        }}
      >
        {children}
      </DialogContent>
      {actions && (
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AppDialog;
