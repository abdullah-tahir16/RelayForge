import { alpha, createTheme } from '@mui/material/styles';

export const relayForgeTokens = {
  color: {
    background: '#ededeb',
    backgroundRaised: '#f7f7f4',
    surface: '#ffffff',
    surfaceRaised: '#fbfaf7',
    surfaceRecessed: '#f1f0ec',
    border: '#e0ddd5',
    borderStrong: '#b7b1a4',
    text: '#111411',
    textMuted: '#505850',
    textSubtle: '#7a8077',
    accent: '#157347',
    accentSoft: '#e2f1e7',
    info: '#286b87',
    test: '#1d6694',
    warning: '#916400',
    danger: '#a53242',
    success: '#157347',
  },
  font: {
    ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  },
  shadow: {
    surface: '0 1px 2px rgba(17, 20, 17, 0.05)',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: relayForgeTokens.color.accent,
      contrastText: '#f8faf4',
    },
    secondary: {
      main: relayForgeTokens.color.info,
      contrastText: '#f8faf4',
    },
    error: {
      main: relayForgeTokens.color.danger,
    },
    success: {
      main: relayForgeTokens.color.success,
    },
    warning: {
      main: relayForgeTokens.color.warning,
    },
    info: {
      main: relayForgeTokens.color.info,
    },
    background: {
      default: relayForgeTokens.color.background,
      paper: relayForgeTokens.color.surface,
    },
    text: {
      primary: relayForgeTokens.color.text,
      secondary: relayForgeTokens.color.textMuted,
    },
    divider: alpha(relayForgeTokens.color.borderStrong, 0.64),
    action: {
      hover: alpha(relayForgeTokens.color.accent, 0.08),
      selected: alpha(relayForgeTokens.color.accent, 0.14),
      disabled: alpha(relayForgeTokens.color.textMuted, 0.54),
      disabledBackground: alpha(relayForgeTokens.color.surfaceRecessed, 0.72),
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: relayForgeTokens.font.ui,
    h4: {
      fontSize: '2rem',
      lineHeight: 1.08,
      fontWeight: 800,
      letterSpacing: '-0.035em',
    },
    h5: {
      fontSize: '1.45rem',
      lineHeight: 1.22,
      fontWeight: 700,
      letterSpacing: '-0.035em',
    },
    h6: {
      fontSize: '1.05rem',
      lineHeight: 1.25,
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    subtitle1: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    button: {
      fontWeight: 700,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
    caption: {
      color: relayForgeTokens.color.textSubtle,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
          '--rf-background': relayForgeTokens.color.background,
          '--rf-surface': relayForgeTokens.color.surface,
          '--rf-surface-raised': relayForgeTokens.color.surfaceRaised,
          '--rf-border': relayForgeTokens.color.border,
          '--rf-accent': relayForgeTokens.color.accent,
        },
        'html, body, #root': {
          minHeight: '100%',
        },
        body: {
          margin: 0,
          background: relayForgeTokens.color.background,
          color: relayForgeTokens.color.text,
          fontFeatureSettings: '"ss01", "cv02", "tnum"',
          textRendering: 'optimizeLegibility',
        },
        '*': {
          boxSizing: 'border-box',
        },
        '::selection': {
          color: '#f8faf4',
          background: relayForgeTokens.color.accent,
        },
        'code, pre, kbd, samp': {
          fontFamily: relayForgeTokens.font.mono,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            scrollBehavior: 'auto !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: alpha(relayForgeTokens.color.borderStrong, 0.58),
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          paddingInline: 18,
          transition:
            'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
          '&:focus-visible': {
            outline: `3px solid ${alpha(relayForgeTokens.color.accent, 0.44)}`,
            outlineOffset: 2,
          },
          '&:active': {
            transform: 'translateY(1px)',
          },
        },
        containedPrimary: {
          backgroundColor: relayForgeTokens.color.accent,
          color: '#f8faf4',
          '&:hover': {
            backgroundColor: '#0f5837',
          },
        },
        outlined: {
          borderColor: alpha(relayForgeTokens.color.borderStrong, 0.72),
          color: relayForgeTokens.color.text,
          backgroundColor: relayForgeTokens.color.surface,
          '&:hover': {
            borderColor: relayForgeTokens.color.accent,
            backgroundColor: alpha(relayForgeTokens.color.accent, 0.08),
          },
        },
        text: {
          color: relayForgeTokens.color.textMuted,
          '&:hover': {
            color: relayForgeTokens.color.text,
            backgroundColor: alpha(relayForgeTokens.color.accent, 0.08),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
          borderRadius: 8,
          color: relayForgeTokens.color.textMuted,
          transition:
            'background-color 180ms ease, color 180ms ease, border-color 180ms ease',
          '&:hover': {
            color: relayForgeTokens.color.text,
            backgroundColor: alpha(relayForgeTokens.color.accent, 0.08),
          },
          '&:focus-visible': {
            outline: `3px solid ${alpha(relayForgeTokens.color.accent, 0.44)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: relayForgeTokens.color.surface,
          transition: 'border-color 180ms ease, box-shadow 180ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(relayForgeTokens.color.borderStrong, 0.5),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(relayForgeTokens.color.textMuted, 0.84),
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(relayForgeTokens.color.accent, 0.14)}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: relayForgeTokens.color.accent,
          },
        },
        input: {
          minHeight: 24,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: relayForgeTokens.color.textMuted,
          '&.Mui-focused': {
            color: relayForgeTokens.color.accent,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: alpha(relayForgeTokens.color.borderStrong, 0.46),
        },
        head: {
          color: relayForgeTokens.color.textMuted,
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${alpha(relayForgeTokens.color.borderStrong, 0.76)}`,
          background: relayForgeTokens.color.surface,
          boxShadow: relayForgeTokens.shadow.surface,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(23, 35, 28, 0.5)',
        },
      },
    },
  },
});
