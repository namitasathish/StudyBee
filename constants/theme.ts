import { Platform } from 'react-native';

// Modern dark theme with black, purple, and blue accents
const colors = {
  // Primary colors
  black: '#0A0A0F',
  darkGray: '#121218',
  mediumGray: '#1E1E2E',
  lightGray: '#2A2A3A',
  
  // Accent colors
  primaryBlue: '#3B82F6',
  primaryPurple: '#8B5CF6',
  accentBlue: '#60A5FA',
  accentPurple: '#A78BFA',
  
  // Text colors
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  
  // Utility colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const Colors = {
  dark: {
    // Backgrounds
    background: colors.black,
    backgroundSecondary: colors.darkGray,
    backgroundTertiary: colors.mediumGray,
    
    // Text
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,
    
    // Accents
    primary: colors.primaryBlue,
    primaryLight: colors.accentBlue,
    secondary: colors.primaryPurple,
    secondaryLight: colors.accentPurple,
    
    // UI Elements
    card: colors.mediumGray,
    cardHighlight: colors.lightGray,
    border: 'rgba(255, 255, 255, 0.1)',
    borderFocused: 'rgba(139, 92, 246, 0.5)',
    
    // Status
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    
    // Navigation
    tabBarBackground: colors.darkGray,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: colors.primaryBlue,
    headerBackground: colors.darkGray,
    
    // Glass effect
    glass: {
      background: 'rgba(30, 30, 40, 0.8)',
      border: 'rgba(139, 92, 246, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  
  // Keeping light theme for reference, but focusing on dark mode
  light: {
    ...colors,
    text: colors.textPrimary,
    background: colors.darkGray,
    card: colors.mediumGray,
    border: colors.lightGray,
    tint: colors.primaryBlue,
    icon: colors.textSecondary,
    tabIconDefault: colors.textTertiary,
    tabIconSelected: colors.primaryBlue,
    glass: {
      background: 'rgba(30, 30, 40, 0.8)',
      border: 'rgba(139, 92, 246, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
};

export const glassStyle = (colorScheme: 'light' | 'dark') => ({
  backgroundColor: Colors[colorScheme].glass.background,
  borderWidth: 1,
  borderColor: Colors[colorScheme].glass.border,
  borderRadius: 16,
  overflow: 'hidden',
  shadowColor: Colors[colorScheme].glass.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 5,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
});

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
