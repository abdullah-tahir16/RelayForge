import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { EventDetail } from '../../../../core/types/Event';
import { Delivery } from '../../../../core/types/Delivery';
import { buildTimeline } from './fns';
import { relayForgeTokens } from '../../../../theme/theme';

export interface TimelineProps {
  event: EventDetail;
  deliveries: Delivery[];
}

const Timeline = ({ event, deliveries }: TimelineProps) => {
  const entries = buildTimeline(event, deliveries);

  return (
    <List dense sx={{ p: 0 }}>
      {entries.map((entry, index) => (
        <ListItem
          key={`${entry.label}-${index}`}
          disableGutters
          sx={{
            gap: 1.5,
            py: 1,
            '&:not(:last-child)': {
              borderBottom: 1,
              borderColor: 'divider',
            },
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: index === 0 ? 'primary.main' : 'text.secondary',
              boxShadow: `0 0 0 5px ${alpha(relayForgeTokens.color.accent, 0.1)}`,
            }}
          />
          <ListItemText
            primary={entry.label}
            secondary={new Date(entry.timestamp).toLocaleString()}
            primaryTypographyProps={{ fontWeight: 700 }}
            secondaryTypographyProps={{ fontFamily: relayForgeTokens.font.mono }}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default Timeline;
