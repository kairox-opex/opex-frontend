import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { fetchGroupChatById } from '../../../../src/services/api';
import { users as mockUsers } from '../../../../src/mocks/users';

export default function GroupInfoScreen() {
  const { id } = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const res = await fetchGroupChatById(id);
      if (res.success) {
        setGroup(res.data);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#0f1419' : '#fff' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: isDark ? '#0f1419' : '#fff' }]}>
        <Text style={{ color: theme.text }}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Find members
  const memberIds = group.member_ids || [];
  let members = group.members || group.users || [];
  if (members.length === 0 && memberIds.length > 0) {
    members = mockUsers.filter((u) => memberIds.includes(u.id));
  }

  const renderMember = ({ item }) => {
    const avatar = item.avatar_url || item.avatar;
    const name = item.name || 'Unknown User';
    const role = item.role ? item.role.replace('_', ' ').toUpperCase() : 'MEMBER';

    return (
      <View style={[styles.memberItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.text }]}>{name}</Text>
          <Text style={[styles.memberRole, { color: theme.textSecondary }]}>{role}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? '#0f1419' : '#f8f9fa' }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#111827' : '#ffffff', borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Group Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={[styles.groupHeader, { backgroundColor: isDark ? '#111827' : '#ffffff' }]}>
            <View style={[styles.groupIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe' }]}>
              <Ionicons name="people" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.groupTitle, { color: theme.text }]}>
              {group.title || group.name || 'Group Name'}
            </Text>
            <Text style={[styles.memberCount, { color: theme.textSecondary }]}>
              {members.length > 0 ? members.length : (group.member_count || 0)} {members.length === 1 || (members.length === 0 && group.member_count === 1) ? 'Member' : 'Members'}
            </Text>
          </View>
        }
        renderItem={renderMember}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  groupHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  groupIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 16,
  },
  list: {
    paddingBottom: 40,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 13,
  },
});
