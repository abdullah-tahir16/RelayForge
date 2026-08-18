import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppButton from '../../App/AppButton';

export interface HeaderProps {
  onCreateClick: () => void;
}

const Header = ({ onCreateClick }: HeaderProps) => {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h5">Endpoints</Typography>
      <AppButton onClick={onCreateClick}>New Endpoint</AppButton>
    </Stack>
  );
};

export default Header;
