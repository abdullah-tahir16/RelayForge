export interface NavItem {
  label: string;
  path: string;
}

// Only nav items with a real screen behind them today — §96 also lists
// Overview, Dead Letter Queue, API Keys, Team, and Settings, none of which
// exist yet; listing them here would just be dead links.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Events', path: '/events' },
  { label: 'Endpoints', path: '/endpoints' },
];
