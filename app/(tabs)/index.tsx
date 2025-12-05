import { GlassCard } from '@/components/GlassCard';
import { API_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const DIFFICULTIES = [
  { label: 'Easy', value: 'easy', icon: 'speedometer-outline' },
  { label: 'Medium', value: 'speedometer' },
  { label: 'Hard', value: 'speedometer' },
];

export default function QuizHomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors.dark;
  
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      console.log('Starting quiz generation with:', { topic, difficulty, numberOfQuestions });

      const response = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty,
          numberOfQuestions: Math.min(Math.max(1, Number(numberOfQuestions) || 5), 20), // Limit 1-20 questions
        }),
      });

      console.log('Received response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `Failed to generate quiz. Status: ${response.status}`);
      }

      const responseData = await response.json().catch(e => {
        console.error('Error parsing JSON response:', e);
        throw new Error('Invalid response format from server');
      });

      console.log('Quiz data received:', responseData);

      let questions = Array.isArray(responseData)
        ? responseData
        : responseData.quizQuestions || [];

      if (!Array.isArray(questions) || questions.length === 0) {
        console.error('No valid questions array found in response:', responseData);
        throw new Error('No questions were generated. Please try a different topic.');
      }

      const validatedData = questions.map((q: any, i: number) => {
        if (!q.question || typeof q.question !== 'string') {
          console.error(`Invalid question at index ${i}:`, q);
          throw new Error(`Invalid question format at question ${i + 1}`);
        }

        if (!Array.isArray(q.options) || q.options.length < 2) {
          console.error(`Invalid options at question ${i + 1}:`, q.options);
          throw new Error(`Question ${i + 1} must have at least 2 options`);
        }

        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          console.error(`Invalid correctAnswer at question ${i + 1}:`, q.correctAnswer);
          throw new Error(`Question ${i + 1} has an invalid correct answer`);
        }

        return q;
      });

      console.log('Navigating to quiz screen with', validatedData.length, 'questions');

      if (validatedData.length === 0) {
        throw new Error('No valid questions were generated. Please try again.');
      }

      console.log('First question:', JSON.stringify(validatedData[0], null, 2));

      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(validatedData),
          title: `Quiz: ${topic}`,
        },
      });

    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setError(err.message || 'There was an error generating the quiz. Please try again.');

      if (err.message.includes('Network request failed')) {
        setError('Unable to connect to the server. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1542831371-29b3f30949f8?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10, 10, 15, 0.9)', 'rgba(30, 41, 59, 0.95)']}
          style={styles.overlay}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.welcome}>Welcome to</Text>
                <Text style={styles.appName}>StudyBee🐝</Text>
                
                <Text style={styles.subtitle}>Your personal learning companion</Text>
              </View>

              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>Start a New Quiz</Text>
                
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={18} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Topic</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons 
                      name="search" 
                      size={20} 
                      color={colors.textSecondary} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter a topic (e.g., React, JavaScript, History)"
                      placeholderTextColor={colors.textTertiary}
                      value={topic}
                      onChangeText={setTopic}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Difficulty</Text>
                  <View style={styles.difficultyContainer}>
                    {DIFFICULTIES.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.difficultyButton,
                          difficulty === item.value && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          }
                        ]}
                        onPress={() => setDifficulty(item.value)}
                      >
                        <Ionicons 
                          name={item.icon} 
                          size={16} 
                          color={difficulty === item.value ? '#FFFFFF' : colors.textSecondary}
                          style={styles.difficultyIcon}
                        />
                        <Text 
                          style={[
                            styles.difficultyText,
                            { color: difficulty === item.value ? '#FFFFFF' : colors.text },
                            difficulty === item.value && styles.difficultyTextActive
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Number of Questions</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons 
                      name="list" 
                      size={20} 
                      color={colors.textSecondary} 
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor={colors.textTertiary}
                      value={numberOfQuestions}
                      onChangeText={setNumberOfQuestions}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleStartQuiz}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Start Quiz</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </GlassCard>

              <View style={styles.features}>
                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.featuresGrid}>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="book" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.featureTitle}>Learn</Text>
                    <Text style={styles.featureText}>Access comprehensive study materials</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                      <Ionicons name="bulb" size={24} color={colors.secondary} />
                    </View>
                    <Text style={styles.featureTitle}>Practice</Text>
                    <Text style={styles.featureText}>Test your knowledge with quizzes</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                      <Ionicons name="stats-chart" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.featureTitle}>Track</Text>
                    <Text style={styles.featureText}>Monitor your learning progress</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  welcome: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.dark.textSecondary,
  },
  card: {
    padding: 24,
    marginBottom: 30,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundTertiary,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: Colors.dark.text,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 10,
    padding: 5,
  },
  difficultyButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    margin: 3,
  },
  difficultyIcon: {
    marginRight: 6,
  },
  difficultyText: {
    color: Colors.dark.text,
    fontWeight: '500',
  },
  difficultyTextActive: {
    color: '#FFFFFF',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: 'rgba(59, 130, 246, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#FCA5A5',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  features: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: '100%',
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
});
