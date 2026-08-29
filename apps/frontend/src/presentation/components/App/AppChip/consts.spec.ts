import { describe, expect, it } from 'vitest';
import { STATUS_CHIP_TONE } from './consts';

describe('delivery retry status presentation', () => {
  it('uses distinct active colors for processing and retrying', () => {
    expect(STATUS_CHIP_TONE.PROCESSING.fg).not.toBe(
      STATUS_CHIP_TONE.RETRYING.fg,
    );
  });
});
