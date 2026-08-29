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
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ProjectSwitcherContainer from '../../containers/ProjectSwitcher';
import { NAV_ITEMS } from './consts';
import { relayForgeTokens } from '../../../theme/theme';

const DRAWER_WIDTH = 248;

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
    mainRef.current?.focus();
  }, [location.pathname]);

  const iconByPath: Record<string, ReactNode> = {
    '/events': <BoltIcon fontSize="small" />,
    '/dlq': <ReportProblemIcon fontSize="small" />,
    '/endpoints': <AltRouteIcon fontSize="small" />,
  };

  const drawerContent = (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      p={2.5}
      sx={{
        background:
          `linear-gradient(180deg, ${relayForgeTokens.color.surface} 0%, ${relayForgeTokens.color.backgroundRaised} 100%)`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} mb={4}>
        <Box
          aria-hidden
          sx={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: `0 14px 26px ${alpha(relayForgeTokens.color.accent, 0.18)}`,
          }}
        >
          <HubIcon fontSize="small" />
        </Box>
        <Box minWidth={0}>
          <Typography variant="subtitle1" lineHeight={1} fontWeight={800}>
            RelayForge
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Webhook control plane
          </Typography>
        </Box>
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
      <List component="nav" aria-label="Primary dashboard navigation" sx={{ p: 0 }}>
        {NAV_ITEMS.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={selected}
              sx={{
                mb: 0.75,
                minHeight: 48,
                borderRadius: 3,
                color: selected ? 'text.primary' : 'text.secondary',
                boxShadow: selected
                  ? '0 10px 24px rgba(55, 46, 32, 0.08)'
                  : 'none',
                '&.Mui-selected': {
                  bgcolor: relayForgeTokens.color.surface,
                },
                '&.Mui-selected:hover, &:hover': {
                  bgcolor: selected
                    ? relayForgeTokens.color.surface
                    : alpha(relayForgeTokens.color.text, 0.045),
                },
                '&::before': selected
                  ? {
                      content: '""',
                      width: 4,
                      height: 24,
                      borderRadius: 999,
                      bgcolor: relayForgeTokens.color.accent,
                      position: 'absolute',
                      left: 0,
	                    }
	                  : undefined,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: selected ? 'primary.main' : 'text.secondary',
                }}
              >
                {iconByPath[item.path]}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: selected ? 800 : 700 }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box
        mt="auto"
        pt={3}
        sx={{ borderTop: 1, borderColor: alpha(relayForgeTokens.color.border, 0.9) }}
      >
        <Typography variant="caption" color="text.secondary">
          Delivery lifecycle visibility, endpoint testing, replay, and DLQ
          operations in one project-scoped console.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box display="flex" minHeight="100dvh">
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
          borderRadius: 2,
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
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
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
        sx={{
          bgcolor: 'transparent',
        }}
      >
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (muiTheme) => muiTheme.zIndex.appBar,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 1.5, md: 2 },
            borderBottom: 1,
            borderColor: alpha(relayForgeTokens.color.borderStrong, 0.35),
            bgcolor: alpha(relayForgeTokens.color.backgroundRaised, 0.9),
            backdropFilter: 'blur(14px)',
          }}
        >
          <Toolbar disableGutters sx={{ minHeight: 48, gap: 2 }}>
            {!isDesktop && (
              <IconButton
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={800}
              textTransform="uppercase"
              letterSpacing="0.12em"
              sx={{ display: { xs: 'none', sm: 'block' }, mr: 'auto' }}
            >
              Operations console
            </Typography>
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
          p={{ xs: 2, sm: 3, lg: 4 }}
          sx={{
            '&:focus': { outline: 'none' },
            maxWidth: 1440,
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
