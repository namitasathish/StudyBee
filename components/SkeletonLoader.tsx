import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

type SkeletonLoaderProps = {
  width?: number | string;
  height?: number | string;
  style?: any;
  borderRadius?: number;
};

export function SkeletonLoader({ width = '100%', height = 20, style, borderRadius = 4 }: SkeletonLoaderProps) {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
    return () => {
      pulseAnim.setValue(0.5);
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
});
