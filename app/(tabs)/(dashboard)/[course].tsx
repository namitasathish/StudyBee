import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/config';
import { Module } from '@/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { generateStudyPlanEmail } from '@/utils/emailService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Platform } from 'react-native';

interface DashboardProps {
  courseCode: string;
  courseTitle: string;
  modules: Module[];
  selfRating: number;
}

const DashboardScreen = () => {
  const router = useRouter();
  const { course } = useLocalSearchParams<{ course: string }>();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resources');
  const [aiMessage, setAiMessage] = useState('');
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [courseData, setCourseData] = useState<{
    courseCode: string;
    title: string;
    modules: Module[];
    selfRating: number;
  } | null>(null);

  useEffect(() => {
    if (!course) {
      router.back();
      return;
    }

    try {
      const data = JSON.parse(course);
      setCourseData(data);
      console.log('Dashboard loaded with data:', data);
    } catch (error) {
      console.error('Error parsing course data:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [course]);

  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const generateQuiz = async (module: Module) => {
    if (isGeneratingQuiz) return;
    
    setIsGeneratingQuiz(true);
    
    try {
      const topic = `${courseData?.title} - ${module.module_label}`;
      const numberOfQuestions = 5;
      const difficulty = 'medium';
      
      console.log('Starting quiz generation with:', { topic, difficulty, numberOfQuestions });

      const response = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty,
          numberOfQuestions: Math.min(Math.max(1, Number(numberOfQuestions) || 5), 20)
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
      console.log('First question:', JSON.stringify(validatedData[0], null, 2));

      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(validatedData),
          title: `${courseData?.title || 'Quiz'} - ${module.module_label}`,
        },
      });
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      
      // Check for specific error types
      let errorMessage = 'Failed to generate quiz. ';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        errorMessage += 'Could not connect to the server. ';
      } else if (error.message.includes('timed out')) {
        errorMessage += 'The request took too long. ';
      }
      
      errorMessage += 'Using sample questions instead.';
      
      // Fallback to sample quiz data
      const sampleQuiz = [
        {
          question: `Sample question about ${module.module_label}`,
          options: [
            'Correct answer',
            'Incorrect answer',
            'Another incorrect answer',
            'One more incorrect answer'
          ],
          correctAnswer: 0
        },
        // Add more sample questions if needed
      ];
      
      router.push({
        pathname: '/quiz',
        params: {
          questions: JSON.stringify(sampleQuiz),
          title: `[Sample] ${courseData?.title || 'Quiz'} - ${module.module_label}`,
        },
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const shareStudyPlan = async () => {
    if (!courseData) return;
    
    try {
      const emailBody = generateStudyPlanEmail({
        courseCode: courseData.courseCode,
        courseTitle: courseData.title,
        modules: courseData.modules.map(module => ({
          moduleLabel: module.module_label,
          topics: module.topics.map(topic => ({
            name: topic,
            priority: 'medium',
            resources: []
          }))
        }))
      });

      const emailSubject = `Study Plan: ${courseData.courseCode} - ${courseData.title}`;
      
      // Share the content directly
      await Sharing.shareAsync(
        emailBody,
        {
          dialogTitle: 'Share Study Plan',
          mimeType: 'text/plain',
          UTI: 'public.plain-text',
        }
      );
      
    } catch (error) {
      console.error('Error sharing study plan:', error);
      Alert.alert('Error', 'Failed to share study plan. Please try again.');
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!aiMessage.trim() || isLoading) return;
    
    const userMessage = { role: 'user' as const, content: aiMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setAiMessage('');
    setIsLoading(true);
    
    try {
      // Add typing indicator
      const typingIndicator = { role: 'assistant' as const, content: '...' };
      setChatMessages(prev => [...prev, typingIndicator]);
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI study assistant for the course "${courseData?.title || 'this course'}". ` +
                       `Help the student with their questions, explain concepts, and provide study guidance. ` +
                       `Be concise, clear, and focus on the course material.`
            },
            ...chatMessages.filter(m => m.role !== 'assistant' || m.content !== '...'),
            { role: 'user', content: aiMessage }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      // Remove typing indicator and add actual response
      setChatMessages(prev => [
        ...prev.filter(m => m.content !== '...'),
        { role: 'assistant', content: data.message || "I'm sorry, I couldn't process your request." }
      ]);
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove typing indicator and show error message
      setChatMessages(prev => [
        ...prev.filter(m => m.content !== '...'),
        { 
          role: 'assistant', 
          content: 'I apologize, but I encountered an error. Please try again later.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResources = () => (
    <ScrollView style={styles.resourcesContainer}>
      {courseData?.modules.map((module: Module) => (
        <View key={module.module_label} style={styles.moduleCard}>
          <View style={styles.moduleHeader}>
            <ThemedText style={styles.moduleTitle}>{module.module_label}</ThemedText>
          </View>
          
          <View style={styles.moduleContent}>
            <ThemedText style={styles.topicsTitle}>Topics:</ThemedText>
            <View style={styles.topicsContainer}>
              {module.topics.map((topic, index) => (
                <View key={index} style={styles.topicChip}>
                  <ThemedText style={styles.topicText}>{topic}</ThemedText>
                </View>
              ))}
            </View>
            
            <View style={styles.resourcesSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="book" size={20} color="#4a6fa5" />
                <ThemedText style={styles.sectionTitle}>Textbook Resources</ThemedText>
              </View>
              <TouchableOpacity 
                style={styles.resourceItem}
                onPress={() => {
                  const searchQuery = encodeURIComponent(`${courseData.title} ${module.module_label} textbook`);
                  Linking.openURL(`https://www.google.com/search?q=${searchQuery}`);
                }}
              >
                <ThemedText style={styles.resourceText}>Find textbooks for {module.module_label}</ThemedText>
              </TouchableOpacity>
              
              <View style={[styles.sectionHeader, { marginTop: 15 }]}>
                <Ionicons name="logo-youtube" size={20} color="#ff0000" />
                <ThemedText style={styles.sectionTitle}>Video Resources</ThemedText>
              </View>
              {module.topics.slice(0, 2).map((topic, index) => (
                <TouchableOpacity 
                  key={`yt-${index}`}
                  style={styles.resourceItem}
                  onPress={() => {
                    const searchQuery = encodeURIComponent(`${topic} ${courseData.title} tutorial`);
                    Linking.openURL(`https://www.youtube.com/results?search_query=${searchQuery}`);
                  }}
                >
                  <ThemedText style={styles.resourceText}>{topic} - Watch Tutorial</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.quizButton, isGeneratingQuiz && styles.disabledButton]}
                onPress={() => generateQuiz(module)}
                disabled={isGeneratingQuiz}
              >
                {isGeneratingQuiz ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="quiz" size={18} color="#fff" />
                    <ThemedText style={styles.actionButtonText}>Generate Quiz</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderPomodoro = () => (
    <View style={styles.pomodoroContainer}>
      <PomodoroTimer />
    </View>
  );

  const renderAIChat = () => (
    <View style={styles.chatContainer}>
      <ScrollView style={styles.chatMessages}>
        {chatMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <MaterialCommunityIcons name="robot" size={50} color="#ddd" />
            <ThemedText style={styles.emptyChatText}>
              Ask me anything about {courseData?.title || 'this course'}
            </ThemedText>
          </View>
        ) : (
          chatMessages.map((msg, index) => (
            <View 
              key={index} 
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}
            >
              <ThemedText style={styles.messageText}>{msg.content}</ThemedText>
            </View>
          ))
        )}
      </ScrollView>
      
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          value={aiMessage}
          onChangeText={setAiMessage}
          placeholder="Ask me anything..."
          placeholderTextColor="#999"
          editable={!isLoading}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity 
          style={[styles.sendButton, isLoading && styles.disabledButton]} 
          onPress={sendMessage}
          disabled={isLoading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading || !courseData) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6fa5" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>{courseData.title}</ThemedText>
          <ThemedText style={styles.courseCode}>{courseData.courseCode}</ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setShowPomodoro(!showPomodoro)} 
            style={[styles.headerButton, showPomodoro && styles.activeButton]}
          >
            <MaterialIcons 
              name="timer" 
              size={24} 
              color={showPomodoro ? '#4CAF50' : '#fff'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={shareStudyPlan} 
            style={[styles.headerButton, { marginLeft: 10 }]}
          >
            <Feather name="mail" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'resources' && styles.activeTab]}
          onPress={() => setActiveTab('resources')}
        >
          <Ionicons name="book" size={20} color={activeTab === 'resources' ? '#4a6fa5' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>
            Resources
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <MaterialCommunityIcons name="robot" size={20} color={activeTab === 'ai' ? '#4a6fa5' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
            AI Assistant
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pomodoro' && styles.activeTab]}
          onPress={() => setActiveTab('pomodoro')}
        >
          <MaterialIcons name="timer" size={20} color={activeTab === 'pomodoro' ? '#4a6fa5' : '#666'} />
          <ThemedText style={[styles.tabText, activeTab === 'pomodoro' && styles.activeTabText]}>
            Pomodoro
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'resources' && renderResources()}
      {activeTab === 'ai' && renderAIChat()}
      {activeTab === 'pomodoro' && renderPomodoro()}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
    backgroundColor: '#4a6fa5',
    elevation: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  courseCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  backButton: {
    padding: 5,
  },
  headerButton: {
    padding: 5,
    width: 34,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  activeTabText: {
    color: '#4a6fa5',
    fontWeight: '600',
  },
  pomodoroContainer: {
    flex: 1,
    padding: 16,
  },
  resourcesContainer: {
    flex: 1,
    padding: 15,
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    overflow: 'hidden',
  },
  moduleHeader: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  moduleContent: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  topicsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  topicChip: {
    backgroundColor: '#e9f0f9',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 12,
    color: '#4a6fa5',
  },
  resourcesSection: {
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  resourceItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  resourceText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  quizButton: {
    backgroundColor: '#4a6fa5',
  },
  disabledButton: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  chatMessages: {
    flex: 1,
    padding: 15,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyChatText: {
    marginTop: 15,
    color: '#999',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4a6fa5',
    borderBottomRightRadius: 2,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 2,
    elevation: 1,
  },
  messageText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a6fa5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default DashboardScreen;
