export interface NavItem {
  label: string;
  path: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/overview' },
  { label: 'Events', path: '/events' },
  { label: 'Dead Letter Queue', path: '/dlq' },
  { label: 'Endpoints', path: '/endpoints' },
];
