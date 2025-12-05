import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

interface Module {
  module_label: string;
  topics: string[];
  raw?: string;
  rating?: number;
}

interface StudyPlan {
  meta: {
    course_code: string;
    title: string;
    header?: string;
  };
  modules: Module[];
}
// Replaced LinearGradient with solid color for compatibility

export default function StudyPlanScreen() {
  const router = useRouter();
  const { studyPlan: studyPlanString } = useLocalSearchParams<{ studyPlan: string }>();
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleRatings, setModuleRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resources');
  const [aiMessage, setAiMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [quizSettings, setQuizSettings] = useState({
    difficulty: 'medium',
    numberOfQuestions: 5,
    showSettings: false
  });
  
  // Initialize module ratings with default value of 1
  const initializeRatings = (modules: Module[]) => {
    const ratings: Record<string, number> = {};
    modules.forEach(module => {
      ratings[module.module_label] = module.rating || 1;
    });
    setModuleRatings(ratings);
  };

  // Get all route params at the component level
  const params = useLocalSearchParams<{
    courseCode: string;
    courseTitle: string;
    modules: string;
    header?: string;
  }>();
  
  // Load study plan data
  useEffect(() => {
    const loadData = async () => {
      if (!params.modules) {
        console.log('No modules data provided');
        Alert.alert('Error', 'No course data found');
        router.back();
        return;
      }

      try {
        console.log('Received params:', params);
        const modulesData = JSON.parse(params.modules);
        
        if (!Array.isArray(modulesData)) {
          throw new Error('Invalid modules data format');
        }
        
        console.log('Parsed modules:', modulesData);
        
        const plan: StudyPlan = {
          meta: {
            course_code: params.courseCode || 'COURSE_CODE',
            title: params.courseTitle || 'Course Title',
            header: params.header || ''
          },
          modules: modulesData.map((mod: any) => ({
            module_label: mod.module_label || mod.raw || 'Untitled Module',
            topics: Array.isArray(mod.topics) ? mod.topics : [],
            raw: mod.raw || '',
            rating: mod.rating || 1
          }))
        };
        
        console.log('Created study plan:', plan);
        setStudyPlan(plan);
        
        const initialExpanded: Record<string, boolean> = {};
        plan.modules.forEach((module: Module) => {
          initialExpanded[module.module_label] = false;
        });
        
        setExpandedModules(initialExpanded);
        initializeRatings(plan.modules);
      } catch (error) {
        console.error('Error parsing study plan:', error);
        Alert.alert('Error', 'Failed to load course data. Please try again.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [studyPlanString]);

  const toggleModule = (moduleLabel: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleLabel]: !prev[moduleLabel]
    }));
  };

  const handleSelfRating = (moduleLabel: string, rating: number) => {
    setModuleRatings(prev => ({
      ...prev,
      [moduleLabel]: rating
    }));
    // TODO: Save rating to user profile
  };

  const generateQuiz = async (module: Module) => {
    if (isGeneratingQuiz) return;
    
    setIsGeneratingQuiz(true);
    
    try {
      // Create a topic string that includes module name and its topics
      const topicsText = module.topics.length > 0 
        ? `Topics: ${module.topics.join(', ')}` 
        : '';
      
      const topic = `${studyPlan?.meta?.title || 'Course'} - ${module.module_label} ${topicsText}`.trim();
      
      console.log('Starting quiz generation with:', { 
        topic, 
        difficulty: quizSettings.difficulty, 
        numberOfQuestions: quizSettings.numberOfQuestions 
      });

      console.log('Using API URL:', API_URL);
      const response = await fetch(`${API_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          difficulty: quizSettings.difficulty,
          numberOfQuestions: Math.min(Math.max(1, Number(quizSettings.numberOfQuestions) || 5), 20)
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
          title: `${studyPlan?.meta?.title || 'Quiz'} - ${module.module_label}`,
        },
      });
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      
      // Show error message to user
      Alert.alert(
        'Connection Error',
        'Could not connect to the quiz generation service. Please make sure the backend server is running on port 3001.',
        [
          {
            text: 'Use Sample Questions',
            onPress: () => {
              // Fallback to a simple quiz if there's an error
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
                {
                  question: `Another question about ${module.module_label}`,
                  options: [
                    'Incorrect answer',
                    'Correct answer',
                    'Another incorrect answer',
                    'One more incorrect answer'
                  ],
                  correctAnswer: 1
                }
              ];
              
              router.push({
                pathname: '/quiz',
                params: {
                  questions: JSON.stringify(sampleQuiz),
                  title: `[Sample] ${studyPlan?.meta?.title || 'Quiz'} - ${module.module_label}`,
                },
              });
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsGeneratingQuiz(false);
      setQuizSettings(prev => ({ ...prev, showSettings: false }));
    }
  };

  const renderRatingStars = (module: Module) => {
    const rating = moduleRatings[module.module_label] || 1;
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => handleSelfRating(module.module_label, star)}
            style={styles.starButton}
          >
            <Ionicons 
              name={star <= rating ? 'star' : 'star-outline'}
              size={24}
              color={star <= rating ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const emailStudyPlan = () => {
    // TODO: Implement email functionality
    Alert.alert("Email Study Plan", "Study plan will be emailed to your registered email address.");
  };

  const sendMessage = async () => {
    if (!aiMessage.trim() || isLoadingAI) return;
    
    const userMessage = { role: 'user' as const, content: aiMessage };
    const updatedMessages = [...chatMessages, userMessage];
    
    setChatMessages(updatedMessages);
    setAiMessage('');
    setIsLoadingAI(true);
    
    try {
      // Call Ollama API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          course: studyPlan?.meta?.title || 'general',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || data.response || "I'm sorry, I couldn't process your request. Please try again."
      }]);
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting to the AI service. Please check your connection and try again."
      }]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleRatingChange = (moduleLabel: string, value: number) => {
    setModuleRatings(prev => ({
      ...prev,
      [moduleLabel]: value
    }));
  };

  const renderRatings = () => (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.ratingHeader}>
          <ThemedText style={styles.ratingHeaderText}>
            Rate your understanding of each module (1-5):
          </ThemedText>
          <View style={styles.ratingLegend}>
            <ThemedText style={styles.ratingLegendText}>Beginner</ThemedText>
            <ThemedText style={styles.ratingLegendText}>Expert</ThemedText>
          </View>
        </View>
        
        {studyPlan.modules.map((module: Module) => (
          <View key={module.module_label} style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <ThemedText style={styles.moduleTitle}>{module.module_label}</ThemedText>
              <ThemedText style={styles.ratingValue}>
                {moduleRatings[module.module_label] || 1}/5
              </ThemedText>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={moduleRatings[module.module_label] || 1}
              onValueChange={(value) => handleSelfRating(module.module_label, value)}
              minimumTrackTintColor="#4a6fa5"
              maximumTrackTintColor="#e0e0e0"
              thumbTintColor="#4a6fa5"
            />
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={() => setShowStudyPlan(true)}
        >
          <ThemedText style={styles.generateButtonText}>Generate Study Plan</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderResources = () => {
    if (!studyPlan) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a6fa5" />
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {studyPlan.modules && studyPlan.modules.length > 0 ? (
          studyPlan.modules.map((module: Module) => (
            <View key={module.module_label} style={styles.moduleCard}>
              <View style={styles.moduleHeader}>
                <ThemedText style={styles.moduleTitle}>{module.module_label}</ThemedText>
                <TouchableOpacity onPress={() => toggleModule(module.module_label)}>
                  <MaterialIcons 
                    name={expandedModules[module.module_label] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24} 
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              
              {expandedModules[module.module_label] && (
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
                    <TouchableOpacity style={styles.resourceItem}>
                      <ThemedText style={styles.resourceText}>Recommended Textbook: Introduction to C Programming</ThemedText>
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
                          const searchQuery = encodeURIComponent(`${topic} ${studyPlan?.meta?.title}`);
                          Linking.openURL(`https://www.youtube.com/results?search_query=${searchQuery}`);
                        }}
                      >
                        <ThemedText style={styles.resourceText}>{topic} - Watch Tutorial</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.actionButtons}>
                    {quizSettings.showSettings ? (
                      <View style={styles.quizSettingsContainer}>
                        <View style={styles.settingRow}>
                          <ThemedText style={styles.settingLabel}>Difficulty:</ThemedText>
                          <View style={styles.radioGroup}>
                            {['easy', 'medium', 'hard'].map((level) => (
                              <TouchableOpacity
                                key={level}
                                style={[
                                  styles.radioButton,
                                  quizSettings.difficulty === level && styles.radioButtonActive
                                ]}
                                onPress={() => setQuizSettings(prev => ({
                                  ...prev,
                                  difficulty: level as 'easy' | 'medium' | 'hard'
                                }))}
                              >
                                <ThemedText style={styles.radioButtonText}>
                                  {level.charAt(0).toUpperCase() + level.slice(1)}
                                </ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        
                        <View style={styles.settingRow}>
                          <ThemedText style={styles.settingLabel}>Questions:</ThemedText>
                          <View style={styles.numberInputContainer}>
                            <TouchableOpacity 
                              style={styles.numberButton}
                              onPress={() => setQuizSettings(prev => ({
                                ...prev,
                                numberOfQuestions: Math.max(1, prev.numberOfQuestions - 1)
                              }))}
                              disabled={quizSettings.numberOfQuestions <= 1}
                            >
                              <ThemedText style={styles.numberButtonText}>-</ThemedText>
                            </TouchableOpacity>
                            
                            <ThemedText style={styles.numberDisplay}>
                              {quizSettings.numberOfQuestions}
                            </ThemedText>
                            
                            <TouchableOpacity 
                              style={styles.numberButton}
                              onPress={() => setQuizSettings(prev => ({
                                ...prev,
                                numberOfQuestions: Math.min(20, prev.numberOfQuestions + 1)
                              }))}
                              disabled={quizSettings.numberOfQuestions >= 20}
                            >
                              <ThemedText style={styles.numberButtonText}>+</ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <View style={styles.quizActionButtons}>
                          <TouchableOpacity 
                            style={[styles.quizActionButton, styles.cancelButton]}
                            onPress={() => setQuizSettings(prev => ({ ...prev, showSettings: false }))}
                          >
                            <ThemedText style={styles.quizActionButtonText}>Cancel</ThemedText>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.quizActionButton, styles.generateButton]}
                            onPress={() => generateQuiz(module)}
                            disabled={isGeneratingQuiz}
                          >
                            {isGeneratingQuiz ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <ThemedText style={styles.quizActionButtonText}>
                                Generate Quiz
                              </ThemedText>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.quizButton]}
                        onPress={() => setQuizSettings(prev => ({ ...prev, showSettings: true }))}
                        disabled={isGeneratingQuiz}
                      >
                        {isGeneratingQuiz ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <MaterialIcons name="quiz" size={18} color="#fff" />
                            <ThemedText style={styles.actionButtonText}>
                              Generate Quiz
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.noModulesContainer}>
            <MaterialIcons name="error-outline" size={48} color="#666" />
            <ThemedText style={styles.noModulesText}>
              No modules found for this course.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    );
  };

  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Timer finished
      setIsActive(false);
      if (!isBreak) {
        // Work session completed, start break
        const newCycles = cycles + 1;
        setCycles(newCycles);
        if (newCycles % 4 === 0) {
          // Long break every 4 cycles
          setTimeLeft(15 * 60); // 15 minutes
          Alert.alert('Great job!', 'Take a 15-30 minute break!');
        } else {
          // Short break
          setTimeLeft(5 * 60); // 5 minutes
          Alert.alert('Good work!', 'Take a 5-minute break!');
        }
      } else {
        // Break completed, start work session
        setTimeLeft(25 * 60); // 25 minutes
        Alert.alert('Break over!', 'Time to focus for 25 minutes!');
      }
      setIsBreak(!isBreak);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, cycles]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
    setCycles(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPomodoro = () => (
    <View style={styles.pomodoroContainer}>
      <ThemedText style={styles.pomodoroTitle}>
        {isBreak ? 'Break Time' : 'Focus Time'}
      </ThemedText>
      <ThemedText style={styles.pomodoroTime}>
        {formatTime(timeLeft)}
      </ThemedText>
      <View style={styles.pomodoroControls}>
        <TouchableOpacity 
          style={[styles.pomodoroButton, isActive ? styles.pauseButton : styles.startButton]}
          onPress={toggleTimer}
        >
          <ThemedText style={styles.pomodoroButtonText}>
            {isActive ? 'Pause' : 'Start'}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.pomodoroButton, styles.resetButton]}
          onPress={resetTimer}
        >
          <ThemedText style={styles.pomodoroButtonText}>Reset</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.pomodoroTip}>
        {isBreak 
          ? 'Take a break! You deserve it.'
          : `Focus on your studies for ${Math.floor(timeLeft / 60)} more minutes.`}
      </ThemedText>
      <ThemedText style={styles.cycleText}>
        Completed cycles: {cycles}
      </ThemedText>
    </View>
  );

  const renderAIChat = () => (
    <View style={styles.chatContainer}>
      <ScrollView style={styles.chatMessages}>
        {chatMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <MaterialCommunityIcons name="robot" size={50} color="#ddd" />
            <ThemedText style={styles.emptyChatText}>Ask me anything about {studyPlan?.meta?.title || 'this course'}</ThemedText>
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
          editable={!isLoadingAI}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity 
          style={[styles.sendButton, isLoadingAI && styles.disabledButton]} 
          onPress={sendMessage}
          disabled={isLoadingAI}
        >
          {isLoadingAI ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6fa5" />
        <ThemedText style={{ marginTop: 16 }}>Loading course content...</ThemedText>
      </View>
    );
  }

  if (!studyPlan) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Failed to load course data.</ThemedText>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.retryButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!showStudyPlan) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {studyPlan?.meta?.title || 'Rate Your Knowledge'}
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
        {renderRatings()}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowStudyPlan(false)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {studyPlan?.meta?.title || 'Study Plan'}
        </ThemedText>
        <TouchableOpacity onPress={emailStudyPlan} style={styles.headerButton}>
          <Ionicons name="mail" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'resources' && styles.activeTab]}
          onPress={() => setActiveTab('resources')}
        >
          <Ionicons 
            name="book" 
            size={20} 
            color={activeTab === 'resources' ? '#4a6fa5' : '#666'} 
          />
          <ThemedText style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>
            Resources
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <Ionicons 
            name="chatbubbles" 
            size={20} 
            color={activeTab === 'ai' ? '#4a6fa5' : '#666'} 
          />
          <ThemedText style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
            AI Assistant
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pomodoro' && styles.activeTab]}
          onPress={() => setActiveTab('pomodoro')}
        >
          <Ionicons 
            name="timer-outline" 
            size={20} 
            color={activeTab === 'pomodoro' ? '#4a6fa5' : '#666'} 
          />
          <ThemedText style={[styles.tabText, activeTab === 'pomodoro' && styles.activeTabText]}>
            Pomodoro
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'resources' ? renderResources() : 
       activeTab === 'ai' ? renderAIChat() : 
       renderPomodoro()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
    paddingBottom: 60, // Add padding to prevent overlap with bottom tabs
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 100,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Add more padding at the bottom for better scrolling
  },
  contentContainer: {
    paddingBottom: 100, // Increased padding to ensure content is not hidden behind bottom tabs
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 10,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a6fa5',
    marginLeft: 10,
  },
  generateButton: {
    backgroundColor: '#4a6fa5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 80, // Increased bottom margin to prevent overlap with bottom tabs
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  // Pomodoro styles
  pomodoroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pomodoroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4a6fa5',
  },
  pomodoroTime: {
    fontSize: 64,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#2c3e50',
  },
  pomodoroControls: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  pomodoroButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginHorizontal: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2ecc71',
  },
  pauseButton: {
    backgroundColor: '#f39c12',
  },
  resetButton: {
    backgroundColor: '#e74c3c',
  },
  pomodoroButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pomodoroTip: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cycleText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#4a6fa5',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  resourcesContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  resourcesContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  ratingHeader: {
    backgroundColor: 'rgba(74, 111, 165, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  ratingHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#4a6fa5',
  },
  ratingLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ratingLegendText: {
    fontSize: 12,
    color: '#666',
  },
  noModulesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noModulesText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#666',
  },
  ratingHeader: {
    padding: 16,
    backgroundColor: 'rgba(74, 111, 165, 0.1)',
    marginBottom: 16,
    borderRadius: 8,
  },
  ratingHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#4a6fa5',
  },
  ratingLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ratingLegendText: {
    fontSize: 12,
    color: '#666',
  },
  moduleHeaderContent: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  star: {
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: Colors.dark.backgroundSecondary,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  backButton: {
    padding: 5,
  },
  headerButton: {
    padding: 5,
    width: 34,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.dark.primary,
  },
  tabText: {
    marginLeft: 8,
    color: Colors.dark.textTertiary,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  resourcesContainer: {
    flex: 1,
    padding: 15,
  },
  moduleCard: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.dark.backgroundTertiary,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  moduleContent: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  topicsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textTertiary,
    marginBottom: 10,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  topicChip: {
    backgroundColor: Colors.dark.backgroundTertiary,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  resourcesSection: {
    marginTop: 10,
  },
  resourceText: {
    fontSize: 13,
    color: Colors.dark.text,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 30, // Add bottom margin to action buttons
  },
  quizSettingsContainer: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.dark.textTertiary,
  },
  radioGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  radioButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  radioButtonActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  radioButtonText: {
    fontSize: 12,
    color: Colors.dark.text,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  numberButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 4,
  },
  numberButtonText: {
    fontSize: 16,
    color: Colors.dark.text,
    fontWeight: 'bold',
  },
  numberDisplay: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.dark.text,
  },
  quizActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  quizActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButton: {
    backgroundColor: Colors.dark.primary,
  },
  cancelButton: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  quizActionButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginLeft: 10,
  },
  quizButton: {
    backgroundColor: Colors.dark.primary,
  },
  actionButtonText: {
    color: Colors.dark.text,
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '500',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    marginBottom: 60, // Add margin to prevent overlap with bottom tabs
  },
  chatMessages: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Add extra padding at the bottom
    backgroundColor: Colors.dark.background,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyChatText: {
    marginTop: 15,
    color: Colors.dark.textTertiary,
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
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderTopRightRadius: 0,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.backgroundSecondary,
    borderTopLeftRadius: 0,
    borderColor: Colors.dark.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: Colors.dark.text,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: 20, // Add extra padding at the bottom
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundTertiary,
    position: 'absolute',
    bottom: 60, // Position above the bottom tabs
    left: 0,
    right: 0,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundSecondary,
    color: Colors.dark.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  star: {
    marginHorizontal: 5,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#888',
  },
  submitRatingButton: {
    backgroundColor: '#4a6fa5',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
  },
  submitRatingText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
