import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={toggleTheme}
      style={[styles.container, {
        backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(147, 197, 253, 0.1)',
      }]}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={theme === 'light' ? 'moon' : 'sunny'}
        size={24} 
        color={theme === 'light' ? '#3B82F6' : '#93C5FD'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});
