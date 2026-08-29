import { alpha } from '@mui/material/styles';
import { relayForgeTokens } from '../../../../theme/theme';

export interface StatusChipTone {
  fg: string;
  bg: string;
  border: string;
  dot: string;
}

function tone(color: string, backgroundAlpha = 0.14): StatusChipTone {
  return {
    fg: color,
    bg: alpha(color, backgroundAlpha),
    border: alpha(color, 0.36),
    dot: color,
  };
}

export const STATUS_CHIP_TONE: Record<string, StatusChipTone> = {
  ACCEPTED: tone(relayForgeTokens.color.textMuted, 0.1),
  PUBLISHED: tone(relayForgeTokens.color.info),
  PROCESSING: tone(relayForgeTokens.color.info),
  COMPLETED: tone(relayForgeTokens.color.success),
  PARTIALLY_FAILED: tone(relayForgeTokens.color.warning),
  FAILED: tone(relayForgeTokens.color.danger),
  DEAD_LETTERED: tone(relayForgeTokens.color.danger, 0.18),
  PENDING: tone(relayForgeTokens.color.textMuted, 0.1),
  RETRYING: tone(relayForgeTokens.color.warning),
  SUCCEEDED: tone(relayForgeTokens.color.success),
  DISABLED: tone(relayForgeTokens.color.textSubtle, 0.1),
  ENABLED: tone(relayForgeTokens.color.success),
  TEST: tone(relayForgeTokens.color.test),
  REPLAY: tone(relayForgeTokens.color.info),
};

export const DEFAULT_STATUS_CHIP_TONE: StatusChipTone = {
  fg: relayForgeTokens.color.textMuted,
  bg: alpha(relayForgeTokens.color.surfaceRaised, 0.7),
  border: alpha(relayForgeTokens.color.borderStrong, 0.7),
  dot: relayForgeTokens.color.textSubtle,
};
