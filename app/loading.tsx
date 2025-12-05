import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export default function LoadingScreen() {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
      ]).start(() => bounce());
    };

    bounce();
    return () => {
      bounceAnim.setValue(0);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.beeContainer,
          { transform: [{ translateY: bounceAnim }] }
        ]}
      >
        <Text style={styles.bee}>🐝</Text>
      </Animated.View>
      <Text style={styles.text}>StudyBee🐝 is buzzing...</Text>
      <Text style={styles.subtext}>Getting everything ready for you!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  beeContainer: {
    marginBottom: 20,
  },
  bee: {
    fontSize: 80,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
});
