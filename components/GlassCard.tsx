import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform, Animated, Pressable, Easing } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { triggerHaptic } from '@/utils/haptics';

// Extend ViewStyle to include web-specific properties
type WebViewStyle = ViewStyle & {
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
};

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurAmount?: number;
};

export const GlassCard = ({ 
  children, 
  style, 
  blurAmount = 10,
  onPress,
  disabled = false,
  ...props
}: GlassCardProps & { onPress?: () => void, disabled?: boolean }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  // For web, we'll use CSS filters
  const webStyles: WebViewStyle = {
    ...(Platform.OS === 'web' ? {
      backdropFilter: `blur(${blurAmount}px)`,
      WebkitBackdropFilter: `blur(${blurAmount}px)`,
      transition: 'all 0.2s ease-in-out',
      cursor: onPress ? 'pointer' : 'default',
    } : {}),
  };

  // For native, we'll use a semi-transparent background
  const nativeBackground = {
    backgroundColor: theme === 'light'
      ? `rgba(255, 255, 255, ${Platform.OS === 'web' ? 0.7 : 0.9})`
      : `rgba(30, 41, 59, ${Platform.OS === 'web' ? 0.7 : 0.9})`,
  };

  const handlePressIn = () => {
    if (onPress) {
      triggerHaptic('light');
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      // Quick fade out and in animation
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onPress());
    }
  };

  const CardContent = (
    <Animated.View 
      style={[
        styles.container,
        nativeBackground,
        {
          borderColor: theme === 'light' 
            ? 'rgba(226, 232, 240, 0.8)' 
            : 'rgba(51, 65, 85, 0.8)',
          shadowColor: theme === 'light' 
            ? 'rgba(0, 0, 0, 0.1)' 
            : 'rgba(0, 0, 0, 0.3)',
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.7 : opacityAnim,
          ...(Platform.OS === 'web' && onPress && !disabled ? {
            ':hover': {
              transform: [{ scale: 1.02 }],
              boxShadow: theme === 'light' 
                ? '0 8px 32px rgba(0, 0, 0, 0.1)' 
                : '0 8px 32px rgba(0, 0, 0, 0.3)',
            },
            ':active': {
              transform: [{ scale: 0.98 }],
            },
          } : {}),
        },
        webStyles,
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={styles.pressable}
      >
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});
