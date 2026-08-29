import { alpha, createTheme } from '@mui/material/styles';

export const relayForgeTokens = {
  color: {
    background: '#ece8dc',
    backgroundRaised: '#f5f2e8',
    surface: '#fffdf7',
    surfaceRaised: '#fffaf0',
    surfaceRecessed: '#e6e1d4',
    border: '#d6cebd',
    borderStrong: '#a99d88',
    text: '#172018',
    textMuted: '#526052',
    textSubtle: '#747d70',
    accent: '#16633f',
    accentSoft: '#dceade',
    info: '#146b83',
    test: '#1d6694',
    warning: '#8c6200',
    danger: '#a83242',
    success: '#16633f',
  },
  font: {
    ui: '"Plus Jakarta Sans", "Aptos", "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  },
  shadow: {
    surface: '0 14px 34px rgba(55, 46, 32, 0.08)',
    glow: '0 0 0 1px rgba(22, 99, 63, 0.18), 0 10px 24px rgba(22, 99, 63, 0.1)',
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
    borderRadius: 10,
  },
  typography: {
    fontFamily: relayForgeTokens.font.ui,
    h4: {
      fontSize: '1.9rem',
      lineHeight: 1.16,
      fontWeight: 700,
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
          background:
            `radial-gradient(circle at 18% -20%, ${alpha(relayForgeTokens.color.accent, 0.08)} 0, transparent 28rem), ` +
            `linear-gradient(135deg, ${relayForgeTokens.color.background} 0%, #f3efe4 58%, #e3ded0 100%)`,
          backgroundAttachment: 'fixed',
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
          minHeight: 44,
          borderRadius: 10,
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
          background:
            `linear-gradient(135deg, ${relayForgeTokens.color.text} 0%, #263229 100%)`,
          color: '#f8faf4',
          boxShadow: `0 10px 22px ${alpha(relayForgeTokens.color.text, 0.18)}`,
          '&:hover': {
            background:
              `linear-gradient(135deg, #0f1711 0%, ${relayForgeTokens.color.text} 100%)`,
            boxShadow: `0 14px 28px ${alpha(relayForgeTokens.color.text, 0.22)}`,
          },
        },
        outlined: {
          borderColor: alpha(relayForgeTokens.color.borderStrong, 0.88),
          color: relayForgeTokens.color.text,
          backgroundColor: alpha(relayForgeTokens.color.surfaceRaised, 0.62),
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
          minWidth: 44,
          minHeight: 44,
          borderRadius: 10,
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
          borderRadius: 9,
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
          background:
            `linear-gradient(180deg, ${alpha(relayForgeTokens.color.surfaceRaised, 0.98)} 0%, ${relayForgeTokens.color.surface} 100%)`,
          boxShadow: relayForgeTokens.shadow.surface,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(23, 35, 28, 0.5)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
  },
});
