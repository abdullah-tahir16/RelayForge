import Login from '../../components/Login';
import { useLoginFeature } from '../../hooks/Login/useLoginFeature';

const LoginContainer = () => {
  const { handleSubmit, isSubmitting, errorMessage } = useLoginFeature();

  return (
    <Login
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    />
  );
};

export default LoginContainer;
