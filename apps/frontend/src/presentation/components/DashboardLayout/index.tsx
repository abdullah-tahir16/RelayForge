import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import BoltIcon from '@mui/icons-material/Bolt';
import HubIcon from '@mui/icons-material/Hub';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ProjectSwitcherContainer from '../../containers/ProjectSwitcher';
import { NAV_ITEMS } from './consts';
import { relayForgeTokens } from '../../../theme/theme';

const SIDEBAR_WIDTH = 232;

export interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const iconByPath: Record<string, ReactNode> = {
    '/overview': <DashboardIcon fontSize="small" />,
    '/events': <BoltIcon fontSize="small" />,
    '/dlq': <ReportProblemIcon fontSize="small" />,
    '/endpoints': <AltRouteIcon fontSize="small" />,
  };

  const drawerContent = (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      p={2}
      sx={{
        position: isDesktop ? 'sticky' : undefined,
        top: isDesktop ? 0 : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} mb={3}>
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: relayForgeTokens.color.accent,
            color: '#f8faf4',
          }}
        >
          <HubIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>
          RelayForge
        </Typography>
        {!isDesktop && (
          <IconButton
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <List
        component="nav"
        aria-label="Primary dashboard navigation"
        sx={{ display: 'grid', gap: 0.5, p: 0 }}
      >
        {NAV_ITEMS.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={selected}
              sx={{
                minHeight: 40,
                px: 1.5,
                borderRadius: '6px',
                color: selected ? relayForgeTokens.color.text : 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: relayForgeTokens.color.accentSoft,
                },
                '&.Mui-selected:hover': {
                  bgcolor: relayForgeTokens.color.accentSoft,
                },
                '&:hover': {
                  bgcolor: alpha(relayForgeTokens.color.text, 0.04),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                {iconByPath[item.path]}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'fixed',
          left: 16,
          top: -80,
          zIndex: (muiTheme) => muiTheme.zIndex.tooltip,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: '6px',
          '&:focus': { top: 16 },
        }}
      >
        Skip to main content
      </Box>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: { md: SIDEBAR_WIDTH },
          flexShrink: 0,
          alignSelf: isDesktop ? 'stretch' : undefined,
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            height: '100%',
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: relayForgeTokens.color.surface,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="section"
        flexGrow={1}
        minWidth={0}
        display="flex"
        flexDirection="column"
      >
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (muiTheme) => muiTheme.zIndex.appBar,
            px: { xs: 2, sm: 3 },
            py: 1.25,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Toolbar disableGutters sx={{ minHeight: 40, gap: 2 }}>
            {!isDesktop && (
              <IconButton
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ ml: 'auto', width: { xs: '100%', sm: 'auto' } }}>
              <ProjectSwitcherContainer />
            </Box>
          </Toolbar>
        </Box>

        <Box
          id="main-content"
          component="main"
          ref={mainRef}
          tabIndex={-1}
          flexGrow={1}
          minWidth={0}
          p={{ xs: 2, sm: 3 }}
          sx={{
            '&:focus': { outline: 'none' },
            maxWidth: 1200,
            mx: 'auto',
            width: '100%',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
