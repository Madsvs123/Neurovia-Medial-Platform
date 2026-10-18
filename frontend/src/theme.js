import { extendTheme } from '@chakra-ui/react';

// ─── Color Scale Generator ─────────────────────────────────────────────
// Maps a hex color to a 50–900 palette (used for dynamic theme scales)
// For now we define explicit scales for brand, primary, accent.

// ─── Core Palette ──────────────────────────────────────────────────────
const colors = {
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  primary: {
    50: '#e6fffa',
    100: '#b2f5ea',
    200: '#81e6d9',
    300: '#4fd1c5',
    400: '#38b2ac',
    500: '#319795',
    600: '#2c7a7b',
    700: '#285e61',
    800: '#234e52',
    900: '#1d4044',
  },
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Semantic status colors
  success: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
    300: '#86efac', 400: '#4ade80', 500: '#22c55e',
    600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
  },
  warning: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a',
    300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b',
    600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
  },
  error: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca',
    300: '#fca5a5', 400: '#f87171', 500: '#ef4444',
    600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
  },
  info: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
    300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
    600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
  },
};

// ─── Typography ────────────────────────────────────────────────────────
const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
};

// ─── Color Mode ────────────────────────────────────────────────────────
const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// ─── Shadow Scale ──────────────────────────────────────────────────────
const shadows = {
  card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
  'card-hover': '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
  'card-raised': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
};

// ─── Border Radii ──────────────────────────────────────────────────────
const radii = {
  card: 'xl',
  badge: 'full',
  button: 'lg',
};

// ─── Global Styles ─────────────────────────────────────────────────────
const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      color: props.colorMode === 'dark' ? 'white' : 'gray.800',
    },
    '.page-container': {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 16px',
    },
    '.section-title': {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '24px',
    },
  }),
};

// ─── Custom: Card Presets ──────────────────────────────────────────────
// These define the base card anatomy shared by all card components.
export const CARD_PRESETS = {
  base: {
    bg: { light: 'white', dark: 'gray.800' },
    borderRadius: 'xl',
    borderWidth: '1px',
    borderColor: { light: 'gray.200', dark: 'gray.700' },
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    _hover: {
      transform: 'translateY(-4px)',
      boxShadow: 'card-hover',
      borderColor: { light: 'gray.300', dark: 'gray.600' },
    },
  },
  accentBar: {
    height: '4px',
    borderRadius: 'full',
  },
  sections: {
    header: { px: 5, pt: 5, pb: 2 },
    body: { px: 5, py: 2 },
    footer: { px: 5, pb: 5, pt: 3 },
  },
};

// ─── Custom: Difficulty Levels ─────────────────────────────────────────
// Shared across ClinicalCaseCard and QuizCard
export const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    colorScheme: 'success',
    dotColor: { light: 'success.500', dark: 'success.300' },
    gradientFrom: 'success.400',
    gradientTo: 'success.600',
  },
  medium: {
    label: 'Medium',
    colorScheme: 'warning',
    dotColor: { light: 'warning.500', dark: 'warning.300' },
    gradientFrom: 'warning.400',
    gradientTo: 'warning.600',
  },
  hard: {
    label: 'Hard',
    colorScheme: 'error',
    dotColor: { light: 'error.500', dark: 'error.300' },
    gradientFrom: 'error.400',
    gradientTo: 'error.600',
  },
};

// ─── Custom: Program Types ─────────────────────────────────────────────
// Centralised — every card and page pulls from here
export const PROGRAM_TYPES = {
  free_access: {
    label: 'Free Access',
    iconName: 'FiGift',
    colorScheme: 'primary',
    dotColor: { light: 'primary.500', dark: 'primary.300' },
    gradient: 'linear(135deg, primary.500, primary.700)',
  },
  discount_access: {
    label: 'Discount',
    iconName: 'FiPercent',
    colorScheme: 'brand',
    dotColor: { light: 'brand.500', dark: 'brand.300' },
    gradient: 'linear(135deg, brand.500, brand.700)',
  },
  quiz_bundle: {
    label: 'Quiz Bundle',
    iconName: 'FiAward',
    colorScheme: 'info',
    dotColor: { light: 'info.500', dark: 'info.300' },
    gradient: 'linear(135deg, info.500, info.700)',
  },
  clinical_cases_bundle: {
    label: 'Clinical Cases',
    iconName: 'FiTrendingUp',
    colorScheme: 'accent',
    dotColor: { light: 'accent.600', dark: 'accent.300' },
    gradient: 'linear(135deg, accent.500, accent.700)',
  },
  premium_unlock: {
    label: 'Premium',
    iconName: 'FiBookOpen',
    colorScheme: 'orange',
    dotColor: { light: 'orange.500', dark: 'orange.300' },
    gradient: 'linear(135deg, orange.500, orange.700)',
  },
};

// ─── Component-Specific Styles ─────────────────────────────────────────
const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'lg',
      transition: 'all 0.15s',
    },
    variants: {
      solid: (props) => ({
        bg: `${props.colorScheme}.500`,
        color: 'white',
        _hover: {
          bg: `${props.colorScheme}.600`,
          transform: 'translateY(-1px)',
          _disabled: { transform: 'none' },
        },
      }),
      outline: (props) => ({
        borderColor: `${props.colorScheme}.500`,
        color: `${props.colorScheme}.500`,
        _hover: {
          bg: `${props.colorScheme}.50`,
          _dark: { bg: `${props.colorScheme}.900` },
        },
      }),
      ghost: (props) => ({
        color: `${props.colorScheme}.500`,
        _hover: {
          bg: `${props.colorScheme}.50`,
          _dark: { bg: `${props.colorScheme}.900` },
        },
      }),
    },
    defaultProps: { colorScheme: 'primary' },
  },

  Heading: {
    baseStyle: {
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
  },

  Badge: {
    baseStyle: {
      borderRadius: 'full',
      textTransform: 'capitalize',
      fontWeight: '500',
    },
  },

  Input: {
    variants: {
      outline: (props) => ({
        field: {
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          _hover: { borderColor: 'gray.300' },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
          },
        },
      }),
    },
    defaultProps: { focusBorderColor: 'primary.500' },
  },

  Progress: {
    baseStyle: {
      filledTrack: {
        borderRadius: 'full',
      },
      track: {
        borderRadius: 'full',
      },
    },
  },
};

// ─── Assemble Theme ────────────────────────────────────────────────────
const theme = extendTheme({
  colors,
  fonts,
  config,
  shadows,
  radii,
  styles,
  components,
  // Custom namespace accessible via useTheme().themeConfig
  themeConfig: {
    cardPresets: CARD_PRESETS,
    difficulties: DIFFICULTIES,
    programTypes: PROGRAM_TYPES,
  },
});

export default theme;
