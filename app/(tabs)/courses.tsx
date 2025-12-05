import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  SafeAreaView,
  TextInput,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';

type CourseModule = {
  module_label: string;
  raw: string;
  topics: string[];
};

type CourseData = {
  code: string;
  title: string;
  credits: number;
  description: string;
  modules: CourseModule[];
  image: string;
};

interface Course {
  code: string;
  title: string;
  modules?: Module[];
  meta?: {
    course_code: string;
    title: string;
    header?: string;
  };
  [key: string]: any;
}

interface Module {
  module_label: string;
  topics: string[];
  raw?: string;
  rating?: number;
}

const courseFiles = [
  'CSE1013', 'CSE1018', 'CSE2004', 'CSE2005', 'CSE3016', 'CSE3017',
  'CSE3028', 'CSE3037', 'CSE3040', 'CSE3041', 'MAT1021', 'PHY1701',
  'SWE3001', 'CSE3050', 'CSE3090', 'CSE4020', 'CSE4021', 'CSE4022',
  'CSE4023', 'CSE4024', 'ENG1901', 'ENG1902', 'ENG1903', 'HUM1021', 'MAT5015'
];

export default function CoursesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = Colors.dark;
  
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        // Create a static import map for all course files
        const courseImports = {
          'CSE1013': () => import('@/data/courses/CSE1013.json'),
          'CSE1018': () => import('@/data/courses/CSE1018.json'),
          'CSE2004': () => import('@/data/courses/CSE2004.json'),
          'CSE2005': () => import('@/data/courses/CSE2005.json'),
          'CSE3016': () => import('@/data/courses/CSE3016.json'),
          'CSE3017': () => import('@/data/courses/CSE3017.json'),
          'CSE3028': () => import('@/data/courses/CSE3028.json'),
          'CSE3037': () => import('@/data/courses/CSE3037.json'),
          'CSE3040': () => import('@/data/courses/CSE3040.json'),
          'CSE3041': () => import('@/data/courses/CSE3041.json'),
          'MAT1021': () => import('@/data/courses/MAT1021.json'),
          'PHY1701': () => import('@/data/courses/PHY1701.json'),
          'SWE3001': () => import('@/data/courses/SWE3001.json'),
          'CSE3050': () => import('@/data/courses/CSE3050.json'),
          'CSE3090': () => import('@/data/courses/CSE3090.json'),
          'CSE4020': () => import('@/data/courses/CSE4020.json'),
          'CSE4021': () => import('@/data/courses/CSE4021.json'),
          'CSE4022': () => import('@/data/courses/CSE4022.json'),
          'CSE4023': () => import('@/data/courses/CSE4023.json'),
          'CSE4024': () => import('@/data/courses/CSE4024.json'),
          'ENG1901': () => import('@/data/courses/ENG1901.json'),
          'ENG1902': () => import('@/data/courses/ENG1902.json'),
          'ENG1903': () => import('@/data/courses/ENG1903.json'),
          'HUM1021': () => import('@/data/courses/HUM1021.json'),
          'MAT5015': () => import('@/data/courses/MAT5015.json')
        };

        const coursePromises = courseFiles.map(async (code) => {
          try {
            if (!courseImports[code]) {
              console.warn(`No import defined for course: ${code}`);
              return null;
            }
            
            const module = await courseImports[code]();
            const courseInfo = module[code] || module.default?.[code];
            
            if (!courseInfo) {
              console.warn(`No course data found for ${code}`);
              return null;
            }

            return {
              code,
              title: courseInfo.meta?.title || code,
              description: courseInfo.meta?.header || 'Course details not available',
              credits: 3, // Default credits if not specified
              modules: courseInfo.modules || [],
              image: `https://ui-avatars.com/api/?name=${encodeURIComponent(code)}&background=3B82F6&color=fff&size=200`,
            };
          } catch (err) {
            console.warn(`Error loading course ${code}:`, err);
            return null;
          }
        });

        const loadedCourses = (await Promise.all(coursePromises)).filter(Boolean) as CourseData[];
        
        setCourses(loadedCourses);
        setFilteredCourses(loadedCourses);
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Filter courses based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = courses.filter(
        course => 
          course.code.toLowerCase().includes(query) || 
          course.title.toLowerCase().includes(query) ||
          course.description.toLowerCase().includes(query)
      );
      setFilteredCourses(filtered);
    }
  }, [searchQuery, courses]);

  const handleCoursePress = (course: CourseData) => {
    console.log('Navigating to study page with course:', course.code);
    // Navigate to the self-rating page with course data
    router.push({
      pathname: '/(tabs)/study',
      params: { 
        courseCode: course.code,
        courseTitle: course.title,
        modules: JSON.stringify(course.modules || []),
        header: course.meta?.header || ''
      }
    } as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error, marginTop: 16, textAlign: 'center' }]}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Courses</Text>
          <Text style={styles.subtitle}>Select a course to view its details</Text>
        </View>
        <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search courses"
            style={styles.searchInput}
          />
          {searchQuery.trim() !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.listContent}>
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.courseCard}
              onPress={() => handleCoursePress(item)}
            >
              <View style={styles.courseCardContent}>
                <View style={styles.courseImageContainer}>
                  <Image 
                    source={{ uri: item.image }} 
                    style={{ width: 48, height: 48, borderRadius: 12 }} 
                  />
                  <View style={[styles.courseCodeBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.courseCode, { color: colors.primary }]}>{item.code}</Text>
                  </View>
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName} numberOfLines={1} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                  <Text 
                    style={styles.courseDescription} 
                    numberOfLines={2} 
                    ellipsizeMode="tail"
                  >
                    {item.description}
                  </Text>
                  {item.modules && item.modules.length > 0 && (
                    <Text style={styles.moduleCount}>
                      {item.modules.length} modules • {item.credits} credits
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.courseFooter}>
                <View style={[styles.creditsBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons 
                    name="book-outline" 
                    size={16} 
                    color={colors.primary} 
                    style={styles.creditsIcon} 
                  />
                  <Text style={[styles.credits, { color: colors.primary }]}>
                    {item.credits} credits
                  </Text>
                </View>
                <View style={styles.viewDetailsContainer}>
                  <Text style={[styles.viewDetails, { color: colors.primary }]}>
                    Start Learning
                  </Text>
                  <Ionicons 
                    name="arrow-forward" 
                    size={16} 
                    color={colors.primary} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 8,
  },
  courseCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 40, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  courseImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    alignSelf: 'center',
    position: 'relative',
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  courseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
    lineHeight: 18,
  },
  moduleCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  courseCodeBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  courseCode: {
    fontSize: 10,
    fontWeight: '700',
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditsIcon: {
    marginRight: 4,
  },
  credits: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  viewDetails: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  generateButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  generateButtonDisabled: {
    backgroundColor: '#6B7280',
    shadowColor: 'transparent',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  }
});
