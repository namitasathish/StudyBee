import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type TimerMode = 'work' | 'break' | 'idle';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

export const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  let timer: NodeJS.Timeout;

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    Vibration.vibrate([0, 500, 200, 500]); // Vibrate pattern
    
    if (mode === 'work') {
      setSessionsCompleted(prev => prev + 1);
      setMode('break');
      setTimeLeft(BREAK_DURATION);
      Alert.alert("Time's up!", "Take a 5-minute break!");
    } else {
      setMode('work');
      setTimeLeft(WORK_DURATION);
      Alert.alert("Break's over!", "Time to get back to work!");
    }
    
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    clearInterval(timer);
    setIsActive(false);
    setMode('work');
    setTimeLeft(WORK_DURATION);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.timerContainer}>
        <Text style={[
          styles.timerText,
          { color: mode === 'work' ? '#4a6fa5' : '#4CAF50' }
        ]}>
          {formatTime(timeLeft)}
        </Text>
        <Text style={styles.modeText}>
          {mode === 'work' ? 'Focus Time' : 'Break Time'}
        </Text>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isActive ? styles.pauseButton : styles.startButton]} 
          onPress={toggleTimer}
        >
          <MaterialIcons 
            name={isActive ? 'pause' : 'play-arrow'} 
            size={24} 
            color="#fff" 
          />
          <ThemedText style={styles.buttonText}>
            {isActive ? 'Pause' : 'Start'}
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.resetButton]} 
          onPress={resetTimer}
        >
          <MaterialIcons name="replay" size={24} color="#fff" />
          <ThemedText style={styles.buttonText}>Reset</ThemedText>
        </TouchableOpacity>
      </View>
      
      <View style={styles.stats}>
        <ThemedText style={styles.sessionsText}>
          Sessions completed: {sessionsCompleted}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  modeText: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginHorizontal: 8,
  },
  startButton: {
    backgroundColor: '#4a6fa5',
  },
  pauseButton: {
    backgroundColor: '#FFA000',
  },
  resetButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  stats: {
    alignItems: 'center',
    marginTop: 8,
  },
  sessionsText: {
    fontSize: 14,
    color: '#666',
  },
});
