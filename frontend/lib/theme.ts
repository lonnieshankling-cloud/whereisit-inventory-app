export const theme = {
  colors: {
    brand: {
      primary: '#FACC15',
      primaryHover: '#EAB308',
      primaryActive: '#CA8A04',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      muted: '#9CA3AF',
    },
    surface: {
      white: '#FFFFFF',
      gray50: '#F9FAFB',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
    },
  },
  
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  
  layout: {
    buttonHeight: {
      default: '2.5rem',
      large: '3rem',
    },
    buttonPadding: {
      default: '0 1.5rem',
      large: '0 2rem',
    },
    containerMaxWidth: '72rem',
  },
} as const;

export type Theme = typeof theme;
