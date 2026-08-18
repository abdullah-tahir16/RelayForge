import { AppSelectOption } from '../../App/AppSelect';

export const EVENT_STATUS_OPTIONS: AppSelectOption[] = [
  { value: '', label: 'Any status' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PARTIALLY_FAILED', label: 'Partially failed' },
  { value: 'FAILED', label: 'Failed' },
];
