import DeadLetterQueue from '../../components/DeadLetterQueue';
import { useDeadLetterQueueFeature } from '../../hooks/DeadLetterQueue/useDeadLetterQueueFeature';

const DeadLetterQueueContainer = () => {
  const feature = useDeadLetterQueueFeature();
  return <DeadLetterQueue {...feature} />;
};

export default DeadLetterQueueContainer;
