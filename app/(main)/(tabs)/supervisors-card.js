import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import {
  fetchSupervisors,
  selectAllSupervisors,
  selectSupervisorsLoading
} from '../../../src/store/slices/supervisorsSlice';
import Avatar from '../../../src/components/common/Avatar';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { backToDashboard } from '../../../src/utils/navigation';

export default function SupervisorsCardRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const supervisors = useSelector(selectAllSupervisors);
  const loading = useSelector(selectSupervisorsLoading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchSupervisors());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchSupervisors());
    setRefreshing(false);
  };

  const renderSupervisorItem = ({ item }) => {
    // Each row: name, site chips, open issues count.
    return (
      <TouchableOpacity
        style={[styles.supervisorCard, { backgroundColor: isDark ? '#1c1c1c' : '#ffffff', borderColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}
        onPress={() => router.push(`/supervisors/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Avatar uri={item.avatar_url || item.avatar} name={item.name} size="medium" />
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.sitesWrapper}>
              {item.sites?.slice(0, 3).map((site, index) => (
                <View key={index} style={[styles.siteChip, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
                  <Text style={[styles.siteChipText, { color: '#3b82f6' }]} numberOfLines={1}>
                    {typeof site === 'object' ? site.name : `Site ${site}`}
                  </Text>
                </View>
              ))}
              {item.sites?.length > 3 && (
                <Text style={[styles.moreText, { color: theme.textSecondary }]}>+{item.sites.length - 3} more</Text>
              )}
            </View>
          </View>
          <View style={styles.issueCountBadge}>
            <Text style={styles.issueCountText}>{item.issue_counts?.active || 0}</Text>
            <Text style={styles.issueCountLabel}>OPEN</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RoleGuard action="view:supervisorsCard">
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#111' : '#f9fafb' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: isDark ? '#111' : '#ffffff', borderBottomColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}>
          <TouchableOpacity onPress={backToDashboard} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>MD Team — Supervisors</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={supervisors}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSupervisorItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No Supervisors Found</Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  backBtn: { padding: 4 },
  listContent: { padding: 16, paddingBottom: 40 },
  supervisorCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  sitesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  siteChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  siteChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '500',
  },
  issueCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    minWidth: 45,
  },
  issueCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ef4444',
  },
  issueCountLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#9ca3af',
    marginTop: -2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
});
