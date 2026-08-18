import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { EventDetail } from '../../../../core/types/Event';
import { Delivery } from '../../../../core/types/Delivery';
import { buildTimeline } from './fns';

export interface TimelineProps {
  event: EventDetail;
  deliveries: Delivery[];
}

const Timeline = ({ event, deliveries }: TimelineProps) => {
  const entries = buildTimeline(event, deliveries);

  return (
    <List dense>
      {entries.map((entry, index) => (
        <ListItem key={`${entry.label}-${index}`} disableGutters>
          <ListItemText
            primary={entry.label}
            secondary={new Date(entry.timestamp).toLocaleString()}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default Timeline;
