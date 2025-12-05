import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
};

type UserAnswer = {
  selected: number | null;
  isCorrect: boolean;
  timedOut?: boolean;
};

const QUESTION_TIME = 30; // seconds per question

export default function QuizScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const router = useRouter();
  const questions: QuizQuestion[] = params.questions ? JSON.parse(params.questions as string) : [];
  const quizTitle = params.title ? String(params.title) : 'Quiz';
  
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  useEffect(() => {
    if (showScore) return;
    setTimeLeft(QUESTION_TIME);
    setSelected(null);
    const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [current, showScore]);

  useEffect(() => {
    if (!showScore && timeLeft === 0) {
      handleAnswer(-1, true);
    }
  }, [timeLeft, showScore]);

  const handleAnswer = useCallback((idx: number, timedOut: boolean = false) => {
    if (selected !== null) return;
    const isCorrect = idx === questions[current]?.correctAnswer;
    setSelected(idx);
    setAnswers(prev => [...prev, { selected: idx, isCorrect, timedOut }]);
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent(current + 1);
      } else {
        setShowScore(true);
      }
    }, 1000);
  }, [current, questions, selected]);

  const handleRestart = () => {
    setAnswers([]);
    setShowScore(false);
    setCurrent(0);
    setSelected(null);
    setTimeLeft(QUESTION_TIME);
  };

  if (!questions.length) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={isDark ? Colors.dark.tint : Colors.light.tint} />
        <ThemedText style={{ marginTop: 16 }}>Loading quiz questions...</ThemedText>
      </ThemedView>
    );
  }

  if (showScore) {
    const score = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);
    const getScoreEmoji = () => {
      if (percentage >= 90) return '🎉';
      if (percentage >= 70) return '👍';
      if (percentage >= 50) return '😊';
      return '🤔';
    };

    return (
      <ThemedView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scoreContainer}>
          <View style={styles.scoreHeader}>
            <ThemedText type="title" style={styles.scoreTitle}>Quiz Completed! {getScoreEmoji()}</ThemedText>
            <ThemedText type="subtitle" style={styles.scoreSub}>{quizTitle}</ThemedText>
          </View>
          
          <View style={[styles.scoreCard, isDark ? styles.darkCard : styles.lightCard]}>
            <ThemedText style={styles.scoreNum}>{score}<ThemedText style={styles.scoreTotal}> / {questions.length}</ThemedText></ThemedText>
            <View style={styles.scoreBarContainer}>
              <View style={[styles.scoreBarFill, { width: `${percentage}%` }]} />
            </View>
            <ThemedText style={styles.percentage}>{percentage}%</ThemedText>
          </View>

          <TouchableOpacity 
            style={[styles.restartButton, isDark ? styles.darkButton : styles.lightButton]}
            onPress={handleRestart}
            accessibilityRole="button"
          >
            <ThemedText style={styles.restartButtonText}>⟳ Restart Quiz</ThemedText>
          </TouchableOpacity>
          <View style={styles.answersList}>
            <ThemedText type="subtitle">Review Answers</ThemedText>
            {questions.map((q, i) => {
              const ua = answers[i];
              return (
                <View style={styles.answerItem} key={i}>
                  <ThemedText style={styles.answerQNum}>Q{i+1}.</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.answerQ}>{q.question}</ThemedText>
                    <ThemedText style={ua?.isCorrect ? styles.correctText : styles.incorrectText}>
                      {ua?.timedOut ? 'Time ran out' : ua?.selected !== null && ua?.selected !== -1 ? `Your answer: ${q.options[ua.selected]}` : 'No answer' }
                    </ThemedText>
                    {!ua?.isCorrect && <ThemedText style={styles.correctText}>Correct answer: {q.options[q.correctAnswer]}</ThemedText>}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  const q = questions[current];
  const ua = answers[current];
  const currentQuestion = questions[current];
  
  return (
    <ThemedView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <ThemedText style={styles.progressText}>
              Question {current + 1} <ThemedText style={styles.progressTotal}>/ {questions.length}</ThemedText>
            </ThemedText>
            <View style={[styles.progressBar, isDark ? styles.darkProgressBar : styles.lightProgressBar]}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((current + 1) / questions.length) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          <View style={[styles.timerContainer, isDark ? styles.darkTimer : styles.lightTimer]}>
            <ThemedText style={styles.timerText}>⏱️ {timeLeft}s</ThemedText>
          </View>
        </View>
        
        <View style={[
          styles.questionCard,
          isDark ? styles.darkQuestionCard : styles.lightQuestionCard
        ]}>
          <ThemedText style={[
            styles.questionText,
            isDark ? styles.darkQuestionText : styles.lightQuestionText
          ]}>
            {currentQuestion?.question}
          </ThemedText>
        </View>
        
        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((option, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === currentQuestion.correctAnswer;
            const showCorrect = selected !== null && isCorrect;
            const showIncorrect = isSelected && selected !== currentQuestion.correctAnswer;
            
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  isDark ? styles.darkOption : styles.lightOption,
                  isSelected && styles.selectedOption,
                  showCorrect && styles.correctOption,
                  showIncorrect && styles.incorrectOption,
                ]}
                onPress={() => handleAnswer(idx)}
                disabled={selected !== null}
                accessibilityRole="button"
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIndicator,
                    isSelected && styles.selectedIndicator,
                    showCorrect && styles.correctIndicator,
                    showIncorrect && styles.incorrectIndicator,
                  ]}>
                    <ThemedText style={styles.optionLetter}>
                      {String.fromCharCode(65 + idx)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[
                    styles.optionText,
                    isDark ? styles.darkOptionText : styles.lightOptionText,
                    (showCorrect || showIncorrect) && styles.optionTextSelected,
                  ]}>
                    {option}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { 
    flex: 1, 
    padding: 16,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  progressTotal: {
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  lightProgressBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  darkProgressBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0a84ff',
    borderRadius: 3,
  },
  timerContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightTimer: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  darkTimer: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    padding: 24,
    borderRadius: 10,
    marginBottom: 16,
  },
  lightQuestionCard: {
    backgroundColor: '#fff',
  },
  darkQuestionCard: {
    backgroundColor: '#2f343a',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  lightQuestionText: {
    color: '#000',
  },
  darkQuestionText: {
    color: '#fff',
  },
  optionsContainer: {
    padding: 24,
  },
  optionButton: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  lightOption: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  darkOption: {
    backgroundColor: '#2f343a',
    borderColor: '#555',
    borderWidth: 1,
  },
  selectedOption: {
    borderColor: '#0a84ff',
    borderWidth: 2,
  },
  correctOption: {
    backgroundColor: '#EEFEEE',
    borderColor: '#12d36c',
    borderWidth: 2,
  },
  incorrectOption: {
    backgroundColor: '#FFF2F2',
    borderColor: '#e95156',
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: '#0a84ff',
  },
  correctIndicator: {
    backgroundColor: '#12d36c',
  },
  incorrectIndicator: {
    backgroundColor: '#e95156',
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionText: {
    fontSize: 16,
  },
  lightOptionText: {
    color: '#000',
  },
  darkOptionText: {
    color: '#fff',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  // Score screen styles
  scoreContainer: {
    flexGrow: 1,
    padding: 32,
    paddingTop: 40,
  },
  scoreHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  scoreCard: {
    width: '100%',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lightCard: {
    backgroundColor: '#ffffff',
  },
  darkCard: {
    backgroundColor: '#2f343a',
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreSub: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreNum: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0a84ff',
  },
  scoreTotal: {
    fontSize: 24,
    opacity: 0.7,
  },
  scoreBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginVertical: 16,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#0a84ff',
  },
  percentage: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  lightButton: {
    backgroundColor: '#0a84ff',
  },
  darkButton: {
    backgroundColor: '#0a84ff',
  },
  restartButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  answersList: {
    width: '100%',
    marginTop: 24,
  },
  answerItem: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  answerQNum: { marginRight: 6, fontWeight: 'bold' },
  answerQ: { marginBottom: 2 },
  correctText: { color: '#12B669', fontWeight: 'bold' },
  incorrectText: { color: '#e95156', fontWeight: 'bold' },
});
