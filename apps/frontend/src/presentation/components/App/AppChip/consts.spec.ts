import { describe, expect, it } from 'vitest';
import { STATUS_CHIP_COLOR } from './consts';

describe('delivery retry status presentation', () => {
  it('uses distinct active colors for processing and retrying', () => {
    expect(STATUS_CHIP_COLOR.PROCESSING).toBe('info');
    expect(STATUS_CHIP_COLOR.RETRYING).toBe('warning');
  });
});
