import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Calendar, CheckCircle, Clipboard, Clock, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { databaseService, LocalProject } from '../../services/databaseService';

interface ProjectWithProgress extends LocalProject {
  totalItems: number;
  fulfilledItems: number;
  progress: number;
}

export default function ProjectsListScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      await databaseService.initialize();
      const allProjects = await databaseService.getAllProjects();
      
      // Load progress for each project
      const projectsWithProgress = await Promise.all(
        allProjects.map(async (project) => {
          const progress = await databaseService.getProjectProgress(project.id);
          return {
            ...project,
            totalItems: progress.total,
            fulfilledItems: progress.fulfilled,
            progress: progress.total > 0 ? (progress.fulfilled / progress.total) * 100 : 0,
          };
        })
      );
      
      setProjects(projectsWithProgress);
    } catch (error) {
      console.error('Failed to load projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const handleCreateProject = () => {
    // Navigate to create project screen
    router.push('/screens/CreateProjectScreen');
  };

  const handleProjectPress = (project: ProjectWithProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/screens/ProjectDetailScreen',
      params: { projectId: project.id },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="#10B981" size={20} />;
      case 'in_progress':
        return <Clock color="#3B82F6" size={20} />;
      default:
        return <Clipboard color="#6B7280" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const renderProject = ({ item }: { item: ProjectWithProgress }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleProjectPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleRow}>
            {getStatusIcon(item.status)}
            <Text style={styles.projectName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          {item.due_date && (
            <View style={styles.dueDateBadge}>
              <Calendar color="#6B7280" size={12} />
              <Text style={styles.dueDateText}>
                {new Date(item.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text style={styles.projectDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {item.fulfilledItems}/{item.totalItems} items gathered
            </Text>
            <Text style={[styles.progressPercentage, { color: statusColor }]}>
              {Math.round(item.progress)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${item.progress}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateProject}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Clipboard color="#9CA3AF" size={64} />
            <Text style={styles.emptyText}>No projects yet</Text>
            <Text style={styles.emptySubtext}>
              Create a project to track items for your next build or task
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={handleCreateProject}
            >
              <Plus color="#fff" size={20} />
              <Text style={styles.emptyCreateButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  projectDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 999,
  },
  emptyCreateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
