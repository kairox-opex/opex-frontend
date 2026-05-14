import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRequestById,
  updateRequestStatus,
  clearCurrentRequest,
  classifyAmount,
  selectCurrentBudgetRequest,
  selectCurrentBudgetRequestLoading
} from '../../../src/store/slices/budgetSlice';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import { normaliseRole, ROLES } from '../../../src/utils/roles';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { fetchMDContactCard } from '../../../src/services/api';

const STATUS_COLORS = {
  PENDING: '#FF9500',
  PENDING_MD: '#FF9500',
  APPROVED: '#34C759',
  REJECTED: '#FF3B30',
  ESCALATED_CUSTOMER_MD: '#5856D6',
  CMD_APPROVED: '#34C759',
  CMD_REJECTED: '#FF3B30',
};

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { theme, isDark } = useTheme();

  const user = useSelector(selectCurrentUser);
  const userRole = normaliseRole(user?.role);
  const request = useSelector(selectCurrentBudgetRequest);
  const loading = useSelector(selectCurrentBudgetRequestLoading);

  const [rejectModal, setRejectModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'REJECT' | 'ACCEPT' | 'ESCALATE'
  const [note, setNote] = useState('');

  const classification = useSelector(state => state.budget.classification);

  useEffect(() => {
    dispatch(fetchRequestById(id));
    return () => dispatch(clearCurrentRequest());
  }, [dispatch, id]);

  useEffect(() => {
    if (request?.amount_paise) {
      dispatch(classifyAmount(request.amount_paise))
        .unwrap()
        .then(res => console.log('DEBUG Classify Amount Success:', res))
        .catch(err => console.log('DEBUG Classify Amount Error:', err));
    }
  }, [dispatch, request?.amount_paise]);

  const [md, setMd] = useState(null);
  useEffect(() => {
    const fetchMD = async () => {
      const res = await fetchMDContactCard();
      if (res.success && res.md) {
        setMd(res.md);
      }
    };
    fetchMD();
  }, []);

  const handleContactMD = () => {
    if (md?.tel_link) {
      Linking.openURL(md.tel_link).catch(() => {});
    } else if (md?.phone) {
      const sanitized = md.phone.replace(/[^\d+]/g, '');
      Linking.openURL(`tel:${sanitized}`).catch(() => {});
    }
  };

  const handleWhatsAppMD = () => {
    if (md?.whatsapp_link) {
      Linking.openURL(md.whatsapp_link).catch(() => {});
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (type, noteValue = '') => {
    if (type === 'REJECT' && !noteValue.trim()) {
      Alert.alert('Required', 'Please provide a reason for rejection.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await dispatch(updateRequestStatus({ id, type, note: noteValue })).unwrap();
      if (res) {
        let label = 'Processed';
        if (type === 'ACCEPT' || type === 'ESC_ACCEPT') label = 'Approved';
        else if (type === 'REJECT' || type === 'ESC_REJECT') label = 'Rejected';
        else if (type === 'ESCALATE') label = 'Escalated';
        
        Alert.alert('Success', `Request ${label} successfully`);
        setRejectModal(false);
        setNote('');
        // Re-fetch to update status badge
        dispatch(fetchRequestById(id));
      }
    } catch (err) {
      Alert.alert('Error', err || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !request) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[request.status] || STATUS_COLORS[request.status?.toUpperCase()] || theme.textSecondary;
  const statusUpper = (request.status || '').toUpperCase();
  const isPending = ['PENDING', 'PENDING_MD'].includes(statusUpper);
  const isEscalated = statusUpper === 'ESCALATED_CUSTOMER_MD';
  
  const canActMD = userRole === ROLES.MANAGER && isPending;
  const canActCMD = userRole === ROLES.CUSTOMER_MD && isEscalated;
  const canAct = canActMD || canActCMD;

  const tierValue = classification?.classification || classification?.tier;
  const tierStr = (tierValue || '').toUpperCase();
  const needsEscalation = tierStr === 'CUSTOMER_MD_APPROVAL' || tierStr === 'MD_PLUS_CUSTOMER_MD' || tierStr === 'CMD_APPROVAL';

  const fmtCurrency = (paise) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(paise / 100);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Budget Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Status */}
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{request.status}</Text>
            </View>
          </View>

          {/* Details */}
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : theme.card, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
            <Text style={[styles.title, { color: theme.text }]}>{request.title}</Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.amount, { color: theme.primary }]}>{fmtCurrency(request.amount_paise)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Site</Text>
                <Text style={[styles.value, { color: theme.text }]}>{request.site?.name || request.site_name || 'N/A'}</Text>
                {request.site?.location && (
                  <Text style={[styles.subValue, { color: theme.textSecondary }]}>{request.site.location}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Raised By</Text>
                <Text style={[styles.value, { color: theme.text }]}>{request.raised_by?.name || 'N/A'}</Text>
                {request.raised_by?.role && (
                  <Text style={[styles.subValue, { color: theme.textSecondary }]}>{request.raised_by.role}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Reason</Text>
            <Text style={[styles.reason, { color: theme.text }]}>{request.reason || 'No reason provided'}</Text>
          </Animated.View>

          {/* MD Contact Action */}
          {md && (
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : theme.card, borderColor: theme.border, marginTop: -8 }]}>
              <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 8 }]}>Need help?</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.border, flex: 1, flexDirection: 'row' }]} onPress={handleContactMD}>
                  <Ionicons name="call" size={16} color={theme.text} />
                  <Text style={{ color: theme.text, fontWeight: '600', marginLeft: 8 }}>Contact MD</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366', borderWidth: 0, flex: 1, flexDirection: 'row' }]} onPress={handleWhatsAppMD}>
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 8 }}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Audit Log Timeline */}
          <View style={styles.timelineSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Audit Log History</Text>
            {request.audit_log?.map((log, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineGraphic}>
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                  {index < request.audit_log.length - 1 && <View style={[styles.line, { backgroundColor: theme.border }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.actionText, { color: theme.text }]}>{log.action}</Text>
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>{new Date(log.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.userText, { color: theme.textSecondary }]}>By {log.user_name}</Text>
                  {log.note && (
                    <View style={[styles.noteBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                      <Text style={[styles.noteText, { color: theme.text }]}>"{log.note}"</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        {canAct && (
          <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: theme.danger }]} 
                onPress={() => { 
                  setActionType(canActCMD ? 'ESC_REJECT' : 'REJECT'); 
                  setRejectModal(true); 
                }}
              >
                <Text style={{ color: theme.danger, fontWeight: '700' }}>Reject</Text>
              </TouchableOpacity>
              
              {canActCMD ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.primary }]} 
                  onPress={() => { 
                    setActionType('ESC_ACCEPT'); 
                    setRejectModal(true); 
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>CMD Approve</Text>
                </TouchableOpacity>
              ) : needsEscalation ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn, { backgroundColor: '#5856D6' }]} 
                  onPress={() => { setActionType('ESCALATE'); setRejectModal(true); }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Escalate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn, { backgroundColor: theme.primary }]} 
                  onPress={() => { setActionType('ACCEPT'); setRejectModal(true); }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Approve</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Note Modal */}
        <Modal visible={rejectModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                { (actionType === 'ACCEPT' || actionType === 'ESC_ACCEPT') ? '✅ Approve Request' : 
                  (actionType === 'REJECT' || actionType === 'ESC_REJECT') ? '❌ Reject Request' : 
                  '⬆️ Escalate Request' }
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                { (actionType === 'ACCEPT' || actionType === 'ESC_ACCEPT') ? 'Optional: Add an approval note' : 'Required: Provide a reason' }
              </Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                placeholder={(actionType === 'ACCEPT' || actionType === 'ESC_ACCEPT') ? 'e.g. Approved. Proceed with vendor.' : 'Reason for action...'}
                placeholderTextColor={theme.textSecondary}
                multiline
                value={note}
                onChangeText={setNote}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setRejectModal(false); setNote(''); }}>
                  <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSubmit, { 
                    backgroundColor: (actionType === 'REJECT' || actionType === 'ESC_REJECT') ? theme.danger : 
                                     actionType === 'ESCALATE' ? '#5856D6' : theme.primary,
                    opacity: submitting ? 0.6 : 1
                  }]}
                  onPress={() => handleAction(actionType, note)}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '700' }}>Confirm</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  statusSection: { marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '700' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1 },
  amount: { fontSize: 20, fontWeight: '800' },
  value: { fontSize: 16, fontWeight: '600' },
  subValue: { fontSize: 12, marginTop: 2 },
  reason: { fontSize: 15, lineHeight: 22 },
  timelineSection: { paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  timelineItem: { flexDirection: 'row', minHeight: 70 },
  timelineGraphic: { width: 24, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, zIndex: 1 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  actionText: { fontSize: 15, fontWeight: '700' },
  dateText: { fontSize: 12 },
  userText: { fontSize: 13 },
  noteBox: { marginTop: 8, padding: 10, borderRadius: 8 },
  noteText: { fontSize: 14, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  approveBtn: { flex: 2, borderWidth: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalInput: { height: 100, borderRadius: 12, padding: 12, borderWidth: 1, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalSubmit: { paddingHorizontal: 24, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
