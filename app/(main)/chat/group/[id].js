import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import ChatBubble from '../../../../src/components/chat/ChatBubble';
import AIMonthlySummary from '../../../../src/components/chat/AIMonthlySummary';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import { users as mockUsers } from '../../../../src/mocks/users';
import {
  fetchGroupChatById,
  fetchGroupMessages,
  sendGroupMessageAPI,
  markGroupAsRead
} from '../../../../src/services/api';
import { normaliseRole, ROLES } from '../../../../src/utils/roles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Animated Header ────────────────────────────────────────────── */
const AnimatedHeader = ({ group, pinnedCount, showPinned, setShowPinned, onBack, onDelete, canDelete, theme, isDark, onTitlePress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const memberCount = group?.member_count || group?.member_ids?.length || 0;

  return (
    <Animated.View
      style={[
        styles.header,
        {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        testID="group-back"
        style={styles.backBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="chevron-back" size={22} color={theme.text} />
      </TouchableOpacity>

      {/* Group icon */}
      <View style={[styles.headerIconWrap]}>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe' }]}>
          <Ionicons name="people" size={18} color={theme.primary} />
        </View>
        <View style={[styles.onlineDot, { borderColor: isDark ? '#111827' : '#ffffff' }]} />
      </View>

      <TouchableOpacity 
        style={{ flex: 1, marginLeft: 12 }}
        onPress={onTitlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
          {group?.title || group?.name || 'Loading...'}
        </Text>
        <View style={styles.headerMetaRow}>
          <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
            <Ionicons name="people-outline" size={10} color={theme.primary} />
            <Text style={[styles.metaBadgeText, { color: theme.primary }]}>{memberCount}</Text>
          </View>
          {pinnedCount > 0 && (
            <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : '#fefce8' }]}>
              <Ionicons name="bookmark" size={10} color={theme.warning} />
              <Text style={[styles.metaBadgeText, { color: theme.warning }]}>{pinnedCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        {pinnedCount > 0 && (
          <TouchableOpacity
            onPress={() => setShowPinned((v) => !v)}
            testID="group-pinned-toggle"
            style={[
              styles.headerActionBtn,
              {
                backgroundColor: showPinned
                  ? (isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe')
                  : 'transparent',
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPinned ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={showPinned ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.headerActionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

/* ─── Pinned Drawer ──────────────────────────────────────────────── */
const PinnedDrawer = ({ pinnedMessages, theme, isDark }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pinBar,
        {
          backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.pinHeader}>
        <View style={[styles.pinIconBg, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe' }]}>
          <Ionicons name="bookmark" size={12} color={theme.primary} />
        </View>
        <Text style={[styles.pinHeaderText, { color: theme.primary }]}>Pinned Decisions</Text>
        <View style={[styles.pinCount, { backgroundColor: theme.primary }]}>
          <Text style={styles.pinCountText}>{pinnedMessages.length}</Text>
        </View>
      </View>
      {pinnedMessages.map((m, idx) => (
        <View
          key={m.id}
          style={[
            styles.pinItem,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
              borderLeftColor: theme.primary,
            },
            idx > 0 && { marginTop: 6 },
          ]}
        >
          <Text style={[styles.pinItemText, { color: theme.text }]} numberOfLines={2}>
            {m.text}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
};

/* ─── Empty State ────────────────────────────────────────────────── */
const EmptyState = ({ groupName, theme, isDark }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.emptyContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
        <View style={[styles.emptyIconInner, { backgroundColor: isDark ? '#253349' : '#dbeafe' }]}>
          <Ionicons name="chatbubbles" size={36} color={theme.primary} />
        </View>
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{groupName}</Text>
      <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
        Start a conversation with your team members.{'\n'}Messages are secure and private.
      </Text>
      <View style={[styles.securityBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5' }]}>
        <Ionicons name="shield-checkmark" size={12} color="#10b981" />
        <Text style={styles.securityText}>Secure Channel</Text>
      </View>
    </Animated.View>
  );
};

/* ─── Message Row ────────────────────────────────────────────────── */
const MessageRow = ({ item, isOwn, isPinned, senderName, canPin, onPin, theme, isDark }) => (
  <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
    <ChatBubble
      text={item.text}
      isOwn={isOwn}
      senderName={senderName}
      showSender={!isOwn}
      ts={item.ts}
    />
    {canPin && (
      <TouchableOpacity
        onPress={() => onPin(item.id)}
        style={[
          styles.pinBtn,
          isPinned && {
            backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff',
          },
        ]}
        testID={`pin-${item.id}`}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isPinned ? 'bookmark' : 'bookmark-outline'}
          size={13}
          color={isPinned ? theme.primary : theme.textSecondary + '80'}
        />
      </TouchableOpacity>
    )}
  </View>
);

/* ─── Input Bar ──────────────────────────────────────────────────── */
const InputBar = ({ text, setText, onSend, sending, theme, isDark, groupName }) => {
  const hasText = text.trim().length > 0;
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: hasText ? 1 : 0.85,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [hasText]);

  return (
    <View
      style={[
        styles.inputBar,
        {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: isDark ? '#1e2738' : '#f3f4f6',
            borderColor: hasText
              ? (isDark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.2)')
              : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={`Message ${groupName}...`}
          placeholderTextColor={theme.textSecondary + '80'}
          value={text}
          onChangeText={setText}
          multiline
          testID="group-input"
        />
      </View>
      <Animated.View style={{ transform: [{ scale: sendScale }] }}>
        <TouchableOpacity
          onPress={onSend}
          disabled={!hasText || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: hasText ? theme.primary : (isDark ? '#1e2738' : '#e5e7eb'),
              shadowColor: hasText ? theme.primary : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: hasText ? 0.3 : 0,
              shadowRadius: 8,
              elevation: hasText ? 4 : 0,
            },
          ]}
          testID="group-send"
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={16}
              color={hasText ? '#fff' : theme.textSecondary}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function GroupChatDetail() {
  const { id } = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);
  const currentRole = normaliseRole(me?.role);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const listRef = useRef(null);
  const lastTsRef = useRef(null);

  const loadInitial = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    
    // Fetch group details
    const groupRes = await fetchGroupChatById(id);
    if (!groupRes.success) {
      Alert.alert('Error', 'Group not found');
      router.back();
      return;
    }
    setGroup(groupRes.data);
    
    // Fetch initial messages
    const msgsRes = await fetchGroupMessages(id);
    if (msgsRes.success && msgsRes.data.items) {
      // Assuming items are returned newest first (descending order), so reverse to display chronologically
      const fetchedMsgs = [...msgsRes.data.items].reverse();
      setMessages(fetchedMsgs);
      if (fetchedMsgs.length > 0) {
        lastTsRef.current = fetchedMsgs[fetchedMsgs.length - 1].created_at;
      }
    }
    
    // Mark as read
    await markGroupAsRead(id);
    
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    if (!id) return;
    const intervalId = setInterval(async () => {
      const msgsRes = await fetchGroupMessages(id, null, 20); // Fetch latest 20
      if (msgsRes.success && msgsRes.data.items) {
        const fetchedMsgs = [...msgsRes.data.items].reverse();
        setMessages((prev) => {
          // Merge new messages
          const newMsgs = fetchedMsgs.filter(m => !prev.find(p => p.id === m.id));
          if (newMsgs.length > 0) {
            markGroupAsRead(id);
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => {
        try { listRef.current.scrollToEnd({ animated: true }); } catch {}
      }, 80);
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await sendGroupMessageAPI(id, text);
    if (res.success) {
      setText('');
      // Optimistically add or just let polling pick it up. Let's add it optimistically.
      if (res.data) {
        setMessages(prev => [...prev, res.data]);
      }
      await markGroupAsRead(id);
    } else {
      Alert.alert('Error', 'Failed to send message');
    }
    setSending(false);
  };

  const onPin = async (messageId) => {
    Alert.alert('Not Supported', 'Pinning messages not supported yet via API.');
  };

  const handleDelete = async () => {
    Alert.alert('Not Supported', 'Delete group not supported yet via API.');
  };

  const senderName = (fromId) => {
    if (!fromId) return 'System';
    const u = mockUsers.find((x) => x.id === fromId);
    return u?.name || 'Unknown';
  };

  const pinnedMessages = (group?.pinned_ids || [])
    .map((pid) => messages.find((m) => m.id === pid))
    .filter(Boolean);

  const canPin = currentRole === ROLES.MANAGER;
  const canDelete = currentRole === ROLES.MANAGER;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#0f1419' : '#fff' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <RoleGuard action="view:opsGroupChat">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0f1419' : '#ffffff' }]}>
        <AnimatedHeader
          group={group}
          pinnedCount={pinnedMessages.length}
          showPinned={showPinned}
          setShowPinned={setShowPinned}
          onBack={() => router.back()}
          onDelete={handleDelete}
          canDelete={canDelete}
          theme={theme}
          isDark={isDark}
          onTitlePress={() => router.push({ pathname: '/(main)/chat/group/info', params: { id: group?.id } })}
        />

        {showPinned && pinnedMessages.length > 0 && (
          <PinnedDrawer pinnedMessages={pinnedMessages} theme={theme} isDark={isDark} />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.chatArea, { backgroundColor: isDark ? '#0f1419' : '#f8fafc' }]}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<EmptyState groupName={group?.title || group?.name} theme={theme} isDark={isDark} />}
              renderItem={({ item }) => {
                if (item.type === 'ai_summary') {
                  return <AIMonthlySummary summary={item.summary} period={item.period} />;
                }
                const senderId = item.sender?.id || item.sender_id;
                const isOwn = senderId === me?.id;
                const isPinned = (group?.pinned_ids || []).includes(item.id);
                const finalSenderName = item.sender?.name || senderName(senderId);

                return (
                  <MessageRow
                    item={{ ...item, text: item.body || item.text, ts: item.created_at || item.ts }}
                    isOwn={isOwn}
                    isPinned={isPinned}
                    senderName={finalSenderName}
                    canPin={canPin}
                    onPin={onPin}
                    theme={theme}
                    isDark={isDark}
                  />
                );
              }}
            />
          </View>

          <InputBar
            text={text}
            setText={setText}
            onSend={onSend}
            sending={sending}
            theme={theme}
            isDark={isDark}
            groupName={group?.title || group?.name || 'Group'}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerIconWrap: { position: 'relative' },
  headerIcon: {
    width: 40, height: 40, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
  },
  headerName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  metaBadgeText: { fontSize: 10, fontWeight: '700' },
  pinnedToggle: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  pinBar: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pinHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pinIconBg: {
    width: 24, height: 24, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  pinHeaderText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 },
  pinCount: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  pinCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  pinItem: {
    padding: 10, borderRadius: 10,
    borderLeftWidth: 3,
  },
  pinItemText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  chatArea: { flex: 1 },
  list: { padding: 16, flexGrow: 1, paddingBottom: 20, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 1 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  pinBtn: {
    padding: 6, borderRadius: 8,
  },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 40, marginTop: 60,
  },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  emptyIconInner: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22, fontWeight: '800', marginBottom: 10,
    textAlign: 'center', letterSpacing: -0.5,
  },
  emptySub: {
    fontSize: 14, textAlign: 'center', lineHeight: 21,
    marginBottom: 24, opacity: 0.7,
  },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, gap: 6,
  },
  securityText: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, color: '#10b981',
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1,
  },
  inputWrap: {
    flex: 1, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 14.5, paddingTop: 11, paddingBottom: 11,
    maxHeight: 100, letterSpacing: 0.1,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});
