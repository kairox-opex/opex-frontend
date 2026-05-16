import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchGroupChats } from '../../../../src/services/api';
import { users as mockUsers } from '../../../../src/mocks/users';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import { normaliseRole, ROLES } from '../../../../src/utils/roles';

export default function GroupListScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);
  const currentRole = normaliseRole(me?.role);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadGroups = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetchGroupChats();
      if (res.success) {
        const data = res.data || [];
        // Sort by last message timestamp
        const sorted = data.sort((a, b) => {
          const lastA = a.last_message_at || a.created_at;
          const lastB = b.last_message_at || b.created_at;
          return new Date(lastB) - new Date(lastA);
        });
        setGroups(sorted);
      }
    } catch (error) {
      console.error('Failed to load groups', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [me]);

  // Refresh every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGroups(false);
    }, [loadGroups])
  );

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups(false);
  };

  const filteredGroups = groups.filter(g => 
    (g.title || g.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  const getLastMessage = (group) => {
    if (!group.last_message_body) return 'No messages yet';
    const senderName = group.last_message_sender_id === me?.id ? 'You' : (group.last_message_sender_name || 'System');
    return `${senderName}: ${group.last_message_body}`;
  };

  const renderGroupItem = ({ item }) => {
    const lastMsgTs = item.last_message_at || item.created_at;
    
    return (
      <TouchableOpacity
        style={[
          styles.groupItem,
          { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderBottomColor: isDark ? '#2a2a2a' : '#f0f0f0' }
        ]}
        onPress={() => router.push(`/(main)/chat/group/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#333' : '#f0f2f5' }]}>
          <Ionicons name="people" size={24} color={theme.primary} />
          {item.unread_count > 0 && (
            <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
          )}
        </View>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>
              {item.title || item.name}
            </Text>
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTime(lastMsgTs)}
            </Text>
          </View>
          <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {getLastMessage(item)}
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={16} color={isDark ? '#444' : '#ccc'} />
      </TouchableOpacity>
    );
  };

  const canCreateGroup = currentRole === ROLES.MANAGER;

  return (
    <RoleGuard action="view:opsGroupChat">
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111111' : '#f8f9fa' }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
          {canCreateGroup ? (
            <TouchableOpacity 
              onPress={() => router.push('/(main)/chat/group/create')} 
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={28} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderColor: isDark ? '#2a2a2a' : '#e0e0e0' }]}>
            <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search groups..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 12 }]}>Loading messages...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={isDark ? '#333' : '#e0e0e0'} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No groups found</Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerActionBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
