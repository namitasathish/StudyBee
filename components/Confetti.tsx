import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#FFA07A'];
const CONFETTI_COUNT = 50;

type ConfettiPieceProps = {
  left: number;
  delay: number;
  color: string;
  duration: number;
};

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ left, delay, color, duration }) => {
  const fallAnim = useRef(new Animated.Value(-10)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.timing(fallAnim, {
      toValue: height + 10,
      duration: duration + Math.random() * 2000,
      delay,
      useNativeDriver: true,
    });

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000 + Math.random() * 2000,
        useNativeDriver: true,
      })
    );

    Animated.parallel([fall, rotate]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left,
          backgroundColor: color,
          transform: [
            { translateY: fallAnim },
            { rotate: spin },
          ],
        },
      ]}
    />
  );
};

type ConfettiProps = {
  isActive: boolean;
  onComplete?: () => void;
};

export const Confetti: React.FC<ConfettiProps> = ({ isActive, onComplete }) => {
  if (!isActive) return null;

  const confettiPieces = Array.from({ length: CONFETTI_COUNT }).map((_, index) => (
    <ConfettiPiece
      key={index}
      left={Math.random() * width}
      delay={Math.random() * 2000}
      color={CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]}
      duration={3000 + Math.random() * 3000}
    />
  ));

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
