import { Clock, Crown, LogOut, Mail, Trash2, UserPlus, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { householdApi } from '../../services/api';

interface HouseholdManagementScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface HouseholdMember {
  id: string;
  email?: string;
  created_at: string;
  is_owner: boolean;
}

interface PendingInvitation {
  id: number;
  email: string;
  invited_at: string;
  household_id: number;
  status: string;
}

interface Household {
  id: number;
  name: string;
  owner_id: string | null;
  created_at: string;
}

export default function HouseholdManagementScreen({ visible, onClose }: HouseholdManagementScreenProps) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (visible) {
      loadHouseholdData();
    }
  }, [visible]);

  const loadHouseholdData = async () => {
    setLoading(true);
    try {
      const [householdData, membersData, invitesData] = await Promise.all([
        householdApi.get(),
        householdApi.getMembers(),
        householdApi.getInvitations(),
      ]);
      
      if (householdData.household) {
        setHousehold(householdData.household as Household);
        setCurrentUserId(householdData.current_user_id);
      }
      
      setMembers(membersData.members.map(m => ({
        ...m,
        email: m.id, // TODO: Get email from user service
      })) || []);
      
      setPendingInvites(invitesData.invitations.map(inv => ({
        id: inv.id,
        email: inv.invited_email,
        invited_at: inv.created_at,
        household_id: inv.household_id,
        status: inv.status,
      })) || []);
    } catch (error) {
      console.error('Failed to load household data:', error);
      Alert.alert('Error', 'Failed to load household information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simplified role system: Owner vs Member
  const amIOwner = household?.owner_id != null && household.owner_id === currentUserId;

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await householdApi.invite(inviteEmail);
      Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
      await loadHouseholdData();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    }
  };

  const handleResendInvite = async (inviteId: number, email: string) => {
    try {
      await householdApi.resendInvitation(inviteId);
      Alert.alert('Success', `Invitation resent to ${email}`);
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      Alert.alert('Error', 'Failed to resend invitation. Please try again.');
    }
  };

  const handleCancelInvite = async (inviteId: number, email: string) => {
    Alert.alert(
      'Cancel Invitation',
      `Cancel invitation to ${email}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await householdApi.cancelInvitation(inviteId);
              Alert.alert('Success', 'Invitation cancelled');
              await loadHouseholdData();
            } catch (error) {
              console.error('Failed to cancel invitation:', error);
              Alert.alert('Error', 'Failed to cancel invitation. Please try again.');
            }
          },
        },
      ]
    );
  };

  const confirmRemoveMember = (memberId: string, memberEmail: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberEmail} from the household? They will lose access to all inventory data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await householdApi.removeMember(memberId);
              Alert.alert('Success', 'Member removed from household');
              await loadHouseholdData();
            } catch (error) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Leave Household?',
      'You will lose access to all items in this household inventory. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await householdApi.leave();
              Alert.alert('Success', 'You have left the household');
              onClose();
            } catch (error) {
              console.error('Failed to leave household:', error);
              Alert.alert('Error', 'Failed to leave household. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteHousehold = () => {
    Alert.alert(
      'Delete Household?',
      'This will permanently delete the household and remove ALL members. Everyone will lose access immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert(
              'Final Confirmation',
              `Are you absolutely sure? This will delete "${household?.name}" and cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // TODO: Backend needs to implement household deletion endpoint
                      // await householdApi.delete();
                      Alert.alert('Info', 'Household deletion is not yet implemented. Contact support to delete your household.');
                      // onClose();
                    } catch (error) {
                      console.error('Failed to delete household:', error);
                      Alert.alert('Error', 'Failed to delete household. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Users color="#3B82F6" size={28} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{household?.name || 'Household'}</Text>
              <Text style={styles.headerSubtitle}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#6B7280" size={24} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Members */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Members</Text>
              
              {members.map((member) => {
                const isOwner = member.is_owner || member.id === household?.owner_id;
                const isMe = member.id === currentUserId;
                
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={styles.memberEmail}>
                          {member.email || member.id}
                          {isMe && ' (You)'}
                        </Text>
                        {isOwner && <Crown color="#F59E0B" size={16} />}
                      </View>
                      <View style={styles.roleContainer}>
                        <View style={[styles.roleBadge, { backgroundColor: isOwner ? '#FEF3C7' : '#DBEAFE' }]}>
                          <Text style={[styles.roleText, { color: isOwner ? '#F59E0B' : '#3B82F6' }]}>
                            {isOwner ? 'Owner' : 'Member'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Only owner can remove members, but cannot remove themselves */}
                    {amIOwner && !isMe && !isOwner && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => confirmRemoveMember(member.id, member.email || member.id)}
                      >
                        <Trash2 color="#EF4444" size={18} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Invitations</Text>
                
                {pendingInvites.map((invite) => (
                  <View key={invite.id} style={styles.pendingCard}>
                    <View style={styles.pendingInfo}>
                      <View style={styles.pendingHeader}>
                        <Clock color="#F59E0B" size={16} />
                        <Text style={styles.pendingEmail}>{invite.email}</Text>
                      </View>
                      <Text style={styles.pendingLabel}>Awaiting response</Text>
                    </View>

                    <View style={styles.pendingActions}>
                      <TouchableOpacity
                        style={styles.resendButton}
                        onPress={() => handleResendInvite(invite.id, invite.email)}
                      >
                        <Mail color="#3B82F6" size={16} />
                        <Text style={styles.resendText}>Resend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelInvite(invite.id, invite.email)}
                      >
                        <X color="#EF4444" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Invite Member Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => setShowInviteModal(true)}
              >
                <UserPlus color="#FFFFFF" size={20} />
                <Text style={styles.inviteButtonText}>Invite Member</Text>
              </TouchableOpacity>
            </View>

            {/* Role Permissions Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <View style={styles.infoCard}>
                <View style={styles.roleInfoRow}>
                  <Crown color="#F59E0B" size={16} />
                  <Text style={styles.roleInfoText}>
                    <Text style={styles.roleInfoLabel}>Owner:</Text> Full control over household and all items. Can remove members and delete household.
                  </Text>
                </View>
                <View style={styles.roleInfoRow}>
                  <Text style={styles.roleInfoText}>
                    <Text style={styles.roleInfoLabel}>Member:</Text> Can add, edit, and view all items. Can leave household at any time.
                  </Text>
                </View>
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
              
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={amIOwner ? handleDeleteHousehold : handleLeaveHousehold}
              >
                {amIOwner ? (
                  <>
                    <Trash2 color="#EF4444" size={20} />
                    <Text style={styles.dangerButtonText}>Delete Household</Text>
                  </>
                ) : (
                  <>
                    <LogOut color="#EF4444" size={20} />
                    <Text style={styles.dangerButtonText}>Leave Household</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />
          </ScrollView>
        )}

        {/* Invite Modal */}
        <Modal visible={showInviteModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite Member</Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <X color="#6B7280" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="member@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowInviteModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleInviteMember}
                  >
                    <Text style={styles.modalConfirmText}>Send Invitation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingInfo: {
    flex: 1,
    gap: 4,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#92400E',
    opacity: 0.7,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  cancelButton: {
    padding: 6,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  roleInfoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  roleInfoLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
