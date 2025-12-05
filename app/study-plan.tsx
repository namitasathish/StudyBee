import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StudyPlan } from '@/types';

interface Module {
  moduleLabel: string;
  topics: Topic[];
}

interface Topic {
  name: string;
  priority: 'high' | 'medium' | 'low';
  resources?: {
    title: string;
    url: string;
    type: 'youtube' | 'web';
  }[];
}

export default function StudyPlanScreen() {
  const router = useRouter();
  const { studyPlan: studyPlanString } = useLocalSearchParams<{ studyPlan: string }>();
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studyPlanString) {
      router.back();
      return;
    }

    try {
      const plan = JSON.parse(studyPlanString);
      setStudyPlan(plan);
      
      // Initialize expanded state for modules
      const initialExpanded: Record<string, boolean> = {};
      plan.modules.forEach((module: Module) => {
        initialExpanded[module.moduleLabel] = false;
      });
      setExpandedModules(initialExpanded);
    } catch (error) {
      console.error('Error parsing study plan:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [studyPlanString]);

  const toggleModule = (moduleLabel: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleLabel]: !prev[moduleLabel]
    }));
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffd166';
      case 'low': return '#06d6a0';
      default: return '#666';
    }
  };

  const openResource = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error("Don't know how to open URI: " + url);
    }
  };


  if (loading || !studyPlan) {
    return (
      <View style={styles.centered}>
        <ThemedText>Loading your study plan...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.header}>
          <View>
            <ThemedText type="title">Study Plan</ThemedText>
            <ThemedText type="subtitle">{studyPlan.courseCode}: {studyPlan.courseTitle}</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressTitle}>Your Progress</ThemedText>
            <View style={styles.progressStats}>
              <ThemedText>0% Complete</ThemedText>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '0%' }]} />
              </View>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={styles.modulesContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Course Modules
          </ThemedText>
          
          {studyPlan.modules.map((module, moduleIndex) => (
            <View key={module.moduleLabel} style={styles.moduleCard}>
              <TouchableOpacity 
                style={styles.moduleHeader}
                onPress={() => toggleModule(module.moduleLabel)}
              >
                <View style={styles.moduleTitleContainer}>
                  <ThemedText style={styles.moduleIndex}>{moduleIndex + 1}.</ThemedText>
                  <ThemedText style={styles.moduleTitle}>
                    {module.moduleLabel}
                  </ThemedText>
                </View>
                <MaterialIcons 
                  name={expandedModules[module.moduleLabel] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>

              {expandedModules[module.moduleLabel] && (
                <View style={styles.moduleContent}>
                  {module.topics.map((topic, topicIndex) => (
                    <View key={topicIndex} style={styles.topicItem}>
                      <View style={styles.topicHeader}>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(topic.priority) }]}>
                          <ThemedText style={styles.priorityText}>
                            {topic.priority.charAt(0).toUpperCase() + topic.priority.slice(1)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.topicTitle}>{topic.name}</ThemedText>
                      </View>
                      
                      {topic.resources && topic.resources.length > 0 && (
                        <View style={styles.resourcesContainer}>
                          <ThemedText style={styles.resourcesTitle}>Resources:</ThemedText>
                          {topic.resources.map((resource, resIndex) => (
                            <TouchableOpacity 
                              key={resIndex} 
                              style={styles.resourceItem}
                              onPress={() => openResource(resource.url)}
                            >
                              <MaterialIcons 
                                name={resource.type === 'youtube' ? 'ondemand-video' : 'menu-book'} 
                                size={16} 
                                color="#0a7ea4" 
                              />
                              <ThemedText style={styles.resourceText}>
                                {resource.title}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      
                      <View style={styles.actions}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#e6f7ff' }]}
                          onPress={() => {
                            router.push({
                              pathname: '/quiz',
                              params: { 
                                topic: topic.name,
                                difficulty: 'medium',
                                numberOfQuestions: 5
                              }
                            });
                          }}
                        >
                          <MaterialIcons name="quiz" size={16} color="#0a7ea4" />
                          <ThemedText style={[styles.actionButtonText, { color: '#0a7ea4' }]}>
                            Take Quiz
                          </ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#f0f0f0' }]}
                          onPress={() => {
                            console.log(`Marked ${topic.name} as completed`);
                          }}
                        >
                          <MaterialIcons name="check-circle" size={16} color="#52c41a" />
                          <ThemedText style={[styles.actionButtonText, { color: '#52c41a' }]}>
                            Mark as Done
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ThemedView>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressStats: {
    alignItems: 'flex-end',
  },
  progressBar: {
    height: 8,
    width: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  modulesContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  moduleCard: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  moduleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIndex: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    color: '#333',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#333',
  },
  moduleContent: {
    padding: 16,
    paddingTop: 0,
  },
  topicItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  topicTitle: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  resourcesContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  resourcesTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
    marginBottom: 4,
  },
  resourceText: {
    fontSize: 13,
    color: '#0a7ea4',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
});
