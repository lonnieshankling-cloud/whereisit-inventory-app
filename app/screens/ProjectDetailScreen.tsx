

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, CheckCircle, CheckSquare, Circle, Link as LinkIcon, Plus, Sparkles, Square, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { databaseService, LocalItem, LocalProject, LocalProjectItem } from '../../services/databaseService';
import { generateProjectRequirements } from '../../utils/gemini';

interface ProjectItemWithInventory extends LocalProjectItem {
  inventoryItem?: LocalItem;
}

interface AISuggestion {
  label: string;
  selected: boolean;
  matchType: 'exact' | 'partial' | 'none';
  matchedItem?: LocalItem;
}

export default function ProjectDetailScreen() {
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const handleOpenEditModal = () => {
      if (!project) return;
      setEditName(project.name || '');
      setEditDescription(project.description || '');
      setEditDueDate(project.due_date || '');
      setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
      if (!project) return;
      setEditLoading(true);
      try {
        await databaseService.updateProject(project.id, {
          name: editName,
          description: editDescription,
          due_date: editDueDate,
        });
        setShowEditModal(false);
        await loadProject();
      } catch (error) {
        Alert.alert('Error', 'Failed to update project');
      } finally {
        setEditLoading(false);
      }
    };

    const handleDeleteProject = async () => {
      if (!project) return;
      Alert.alert(
        'Delete Project',
        `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await databaseService.deleteProject(project.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                router.back();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete project');
              }
            },
          },
        ]
      );
    };
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  
  const [project, setProject] = useState<LocalProject | null>(null);
  const [projectItems, setProjectItems] = useState<ProjectItemWithInventory[]>([]);
  const [missingItems, setMissingItems] = useState<ProjectItemWithInventory[]>([]);
  const [readyItems, setReadyItems] = useState<ProjectItemWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRequirement, setShowAddRequirement] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedProjectItem, setSelectedProjectItem] = useState<LocalProjectItem | null>(null);
  const [inventoryItems, setInventoryItems] = useState<LocalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      await databaseService.initialize();
      
      const proj = await databaseService.getProjectById(projectId);
      if (!proj) {
        Alert.alert('Error', 'Project not found');
        router.back();
        return;
      }
      
      setProject(proj);
      await loadProjectItems();
      
    } catch (error) {
      console.error('Failed to load project:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectItems = async () => {
    try {
      const items = await databaseService.getProjectItems(projectId);
      
      // Load inventory items for fulfilled items
      const itemsWithInventory = await Promise.all(
        items.map(async (item) => {
          if (item.inventory_item_id) {
            const invItem = await databaseService.getItem(item.inventory_item_id);
            return { ...item, inventoryItem: invItem || undefined };
          }
          return item;
        })
      );
      
      setProjectItems(itemsWithInventory);
      
      // Separate into missing and ready
      const missing = itemsWithInventory.filter(i => i.is_fulfilled === 0);
      const ready = itemsWithInventory.filter(i => i.is_fulfilled === 1);
      
      setMissingItems(missing);
      setReadyItems(ready);
      
      // Check if project is complete
      await checkProjectReadiness();
      
    } catch (error) {
      console.error('Failed to load project items:', error);
    }
  };

  const checkProjectReadiness = async () => {
    const progress = await databaseService.getProjectProgress(projectId);
    
    if (progress.total > 0 && progress.fulfilled === progress.total) {
      // Project is complete!
      if (project?.status !== 'completed') {
        await databaseService.updateProject(projectId, { status: 'completed' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          '🎉 Project Complete!',
          `Congratulations! All ${progress.total} items have been gathered for "${project?.name}".`,
          [{ text: 'Awesome!', onPress: () => loadProject() }]
        );
      }
    } else if (progress.fulfilled > 0 && project?.status === 'planning') {
      // Update to in_progress
      await databaseService.updateProject(projectId, { status: 'in_progress' });
      await loadProject();
    }
  };

  const handleAddRequirement = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    try {
      const itemId = `project_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await databaseService.createProjectItem({
        id: itemId,
        project_id: projectId,
        name: newItemName.trim(),
        is_fulfilled: 0,
        synced: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewItemName('');
      setShowAddRequirement(false);
      await loadProjectItems();
      
    } catch (error) {
      console.error('Failed to add requirement:', error);
      Alert.alert('Error', 'Failed to add requirement');
    }
  };

  const handleLinkInventoryItem = async (projectItem: LocalProjectItem) => {
    setSelectedProjectItem(projectItem);
    
    // Load all inventory items
    const allItems = await databaseService.getAllItems();
    setInventoryItems(allItems);
    setSearchQuery('');
    setShowItemSelector(true);
  };

  const handleSelectInventoryItem = async (inventoryItem: LocalItem) => {
    if (!selectedProjectItem) return;

    try {
      await databaseService.updateProjectItem(selectedProjectItem.id, {
        inventory_item_id: inventoryItem.id,
        is_fulfilled: 1,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowItemSelector(false);
      setSelectedProjectItem(null);
      await loadProjectItems();
      
    } catch (error) {
      console.error('Failed to link item:', error);
      Alert.alert('Error', 'Failed to link item');
    }
  };

  const handleUnlinkItem = async (projectItem: LocalProjectItem) => {
    Alert.alert(
      'Unlink Item',
      'Remove this inventory item from the requirement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.updateProjectItem(projectItem.id, {
                inventory_item_id: undefined,
                is_fulfilled: 0,
              });
              
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await loadProjectItems();
            } catch (error) {
              console.error('Failed to unlink item:', error);
              Alert.alert('Error', 'Failed to unlink item');
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequirement = async (projectItem: LocalProjectItem) => {
    Alert.alert(
      'Delete Requirement',
      `Remove "${projectItem.name}" from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteProjectItem(projectItem.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await loadProjectItems();
            } catch (error) {
              console.error('Failed to delete requirement:', error);
              Alert.alert('Error', 'Failed to delete requirement');
            }
          },
        },
      ]
    );
  };

  const matchInventoryItem = (label: string, items: LocalItem[]) => {
    const normalized = label.trim().toLowerCase();
    const exact = items.find(
      (item) => item.name?.trim().toLowerCase() === normalized
    );
    if (exact) return { matchType: 'exact' as const, matchedItem: exact };

    const partial = items.find((item) =>
      item.name?.toLowerCase().includes(normalized) || normalized.includes(item.name?.toLowerCase() || '')
    );
    if (partial) return { matchType: 'partial' as const, matchedItem: partial };

    return { matchType: 'none' as const, matchedItem: undefined };
  };

  const handleGenerateAIRequirements = async () => {
    if (!project) return;
    setAiLoading(true);
    try {
      const title = project.name || project.description || 'My Project';
      const suggestions = await generateProjectRequirements(title);

      if (!suggestions.length) {
        Alert.alert('No Suggestions', 'AI did not return any requirements. Try another title.');
        return;
      }

      const allInventory = await databaseService.getAllItems();
      setInventoryItems(allInventory);

      const mapped = suggestions.map((label) => {
        const match = matchInventoryItem(label, allInventory);
        return {
          label,
          selected: true,
          matchType: match.matchType,
          matchedItem: match.matchedItem,
        } as AISuggestion;
      });

      setAiSuggestions(mapped);
      setShowAISuggestions(true);
    } catch (error) {
      console.error('AI generation failed:', error);
      Alert.alert('Error', 'Failed to generate requirements with AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSuggestionSelection = (label: string) => {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.label === label ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleConfirmAISuggestions = async () => {
    const selected = aiSuggestions.filter((s) => s.selected);

    if (selected.length === 0) {
      Alert.alert('Select Items', 'Choose at least one requirement to add.');
      return;
    }

    try {
      for (const suggestion of selected) {
        const itemId = `project_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await databaseService.createProjectItem({
          id: itemId,
          project_id: projectId,
          name: suggestion.label,
          is_fulfilled: suggestion.matchType === 'none' ? 0 : 1,
          inventory_item_id: suggestion.matchedItem?.id,
          synced: 0,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAISuggestions(false);
      setAiSuggestions([]);
      await loadProjectItems();
    } catch (error) {
      console.error('Failed to save AI requirements:', error);
      Alert.alert('Error', 'Failed to save generated requirements.');
    }
  };

  const filteredInventoryItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const progress = projectItems.length > 0 
    ? (readyItems.length / projectItems.length) * 100 
    : 0;

  const getStatusColor = () => {
    if (project?.status === 'completed') return '#10B981';
    if (project?.status === 'in_progress') return '#3B82F6';
    return '#6B7280';
  };

  const renderMissingItem = (item: ProjectItemWithInventory) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemRow}>
        <Circle color="#EF4444" size={20} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
        </View>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleLinkInventoryItem(item)}
        >
          <LinkIcon color="#3B82F6" size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRequirement(item)}
        >
          <Trash2 color="#EF4444" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReadyItem = (item: ProjectItemWithInventory) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemRow}>
        <CheckCircle color="#10B981" size={20} />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.inventoryItem && (
            <Text style={styles.linkedText}>
              Linked: {item.inventoryItem.name}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.unlinkButton}
          onPress={() => handleUnlinkItem(item)}
        >
          <X color="#6B7280" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!project) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X color="#111827" size={24} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
          {project.due_date && (
            <View style={styles.dueDateBadge}>
              <Calendar color="#6B7280" size={12} />
              <Text style={styles.dueDateText}>
                Due: {new Date(project.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        {/* Edit and Delete buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', width: 80, justifyContent: 'flex-end' }}>
          <TouchableOpacity onPress={handleOpenEditModal} style={{ marginRight: 8 }}>
            <Square color="#3B82F6" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteProject}>
            <Trash2 color="#EF4444" size={22} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Edit Project Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Project</Text>
            <TextInput
              style={styles.input}
              placeholder="Project name"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              value={editDueDate}
              onChangeText={setEditDueDate}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={editLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
                disabled={editLoading}
              >
                <Text style={styles.saveButtonText}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {readyItems.length}/{projectItems.length} items gathered
          </Text>
          <Text style={[styles.progressPercentage, { color: getStatusColor() }]}>
            {Math.round(progress)}%
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        <View style={styles.progressActions}>
          <TouchableOpacity
            style={[styles.aiButton, aiLoading && styles.buttonDisabled]}
            onPress={handleGenerateAIRequirements}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Sparkles color="#fff" size={18} />
                <Text style={styles.aiButtonText}>Generate List with AI ✨</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {project.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{project.description}</Text>
        </View>
      )}

      {/* Items List */}
      <ScrollView style={styles.content}>
        {/* Missing Items Section */}
        {missingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Missing Items ({missingItems.length})</Text>
            {missingItems.map(renderMissingItem)}
          </View>
        )}

        {/* Ready Items Section */}
        {readyItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ready Items ({readyItems.length})</Text>
            {readyItems.map(renderReadyItem)}
          </View>
        )}

        {projectItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No requirements yet</Text>
            <Text style={styles.emptySubtext}>Add items needed for this project</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Requirement Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddRequirement(true)}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Add Requirement</Text>
        </TouchableOpacity>
      </View>

      {/* Add Requirement Modal */}
      <Modal visible={showAddRequirement} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Requirement</Text>
            <TextInput
              style={styles.input}
              placeholder="Item name"
              value={newItemName}
              onChangeText={setNewItemName}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddRequirement(false);
                  setNewItemName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddRequirement}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Suggestions Review Modal */}
      <Modal visible={showAISuggestions} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Suggestions</Text>
            <Text style={styles.modalSubtitle}>Select the items you want to add</Text>

            <ScrollView style={styles.aiList}>
              {aiSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.label}
                  style={styles.aiItem}
                  onPress={() => toggleSuggestionSelection(suggestion.label)}
                  activeOpacity={0.8}
                >
                  {suggestion.selected ? (
                    <CheckSquare color="#10B981" size={20} />
                  ) : (
                    <Square color="#6B7280" size={20} />
                  )}

                  <View style={styles.aiItemTextContainer}>
                    <Text style={styles.aiItemLabel} numberOfLines={2}>{suggestion.label}</Text>
                    <View style={styles.aiBadgeContainer}>
                      {suggestion.matchType === 'exact' && (
                        <Text style={[styles.aiBadge, styles.aiBadgeExact]}>In Stock</Text>
                      )}
                      {suggestion.matchType === 'partial' && (
                        <Text style={[styles.aiBadge, styles.aiBadgePartial]}>Likely In Stock</Text>
                      )}
                      {suggestion.matchType === 'none' && (
                        <Text style={[styles.aiBadge, styles.aiBadgeMissing]}>Missing</Text>
                      )}
                    </View>
                    {suggestion.matchedItem && (
                      <Text style={styles.aiMatchDetail} numberOfLines={1}>
                        Matched: {suggestion.matchedItem.name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAISuggestions(false);
                  setAiSuggestions([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleConfirmAISuggestions}
              >
                <Text style={styles.saveButtonText}>Add Selected</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Selector Modal */}
      <Modal visible={showItemSelector} animationType="slide">
        <View style={styles.selectorContainer}>
          <View style={styles.selectorHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowItemSelector(false);
                setSelectedProjectItem(null);
              }}
            >
              <X color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.selectorTitle}>Select Inventory Item</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ScrollView style={styles.itemsList}>
            {filteredInventoryItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.inventoryItemCard}
                onPress={() => handleSelectInventoryItem(item)}
              >
                <Text style={styles.inventoryItemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.inventoryItemDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                {item.location_name && (
                  <Text style={styles.inventoryItemLocation}>
                    📍 {item.location_name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            {filteredInventoryItems.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  dueDateText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressInfo: {
    flexDirection: 'row',
  progressActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
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
  descriptionContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  itemNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  linkedText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 2,
  },
  linkButton: {
    padding: 8,
  },
  unlinkButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  aiList: {
    maxHeight: 320,
  },
  aiItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  aiItemTextContainer: {
    flex: 1,
    gap: 4,
  },
  aiItemLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  aiBadgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  aiBadgeExact: {
    backgroundColor: '#10B981',
  },
  aiBadgePartial: {
    backgroundColor: '#3B82F6',
  },
  aiBadgeMissing: {
    backgroundColor: '#9CA3AF',
  },
  aiMatchDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectorContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  selectorHeader: {
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
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  itemsList: {
    flex: 1,
  },
  inventoryItemCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  inventoryItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  inventoryItemLocation: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
