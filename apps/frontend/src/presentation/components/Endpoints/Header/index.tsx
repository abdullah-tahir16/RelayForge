import AppButton from '../../App/AppButton';
import AppPageHeader from '../../App/AppPageHeader';

export interface HeaderProps {
  onCreateClick: () => void;
}

const Header = ({ onCreateClick }: HeaderProps) => {
  return (
    <AppPageHeader
      eyebrow="Destinations"
      title="Endpoints"
      description="Configure webhook receivers, delivery timeouts, signing secrets, and subscriptions."
      actions={<AppButton onClick={onCreateClick}>New endpoint</AppButton>}
    />
  );
};

export default Header;
