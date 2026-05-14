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
  selectSupervisorsLoading,
  selectSupervisorsError
} from '../../../src/store/slices/supervisorsSlice';
import Avatar from '../../../src/components/common/Avatar';
import EmptyState from '../../../src/components/common/EmptyState';

export default function SupervisorsListScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const supervisors = useSelector(selectAllSupervisors);
  const loading = useSelector(selectSupervisorsLoading);
  const error = useSelector(selectSupervisorsError);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchSupervisors());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchSupervisors());
    setRefreshing(false);
  };

  const renderSupervisorItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.supervisorCard, { backgroundColor: isDark ? '#1c1c1c' : '#ffffff', borderColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}
      onPress={() => router.push(`/supervisors/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={item.avatar_url || item.avatar} name={item.name} size="medium" />
        <View style={styles.nameSection}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{item.email || 'No email provided'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>

      <View style={styles.sitesWrapper}>
        {item.sites?.map((site, index) => (
          <View key={index} style={[styles.siteChip, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
            <Text style={[styles.siteChipText, { color: '#3b82f6' }]} numberOfLines={1}>
              {typeof site === 'object' ? site.name : `Site ${site}`}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? '#2e2e2e' : '#f1f5f9' }]} />

      <View style={styles.cardFooter}>
        <View style={styles.statItem}>
          <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
          <Text style={[styles.statValue, { color: theme.text }]}>{item.issue_counts?.active || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Open Issues</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="wallet-outline" size={16} color="#3b82f6" />
          <Text style={[styles.statValue, { color: theme.text }]}>{item.budget_counts?.pending || 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending Budgets</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#111' : '#f9fafb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: isDark ? '#111' : '#ffffff', borderBottomColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
            <EmptyState
              icon="people-outline"
              title="No Supervisors Found"
              message="You haven't assigned any supervisors yet."
            />
          )
        }
      />
    </SafeAreaView>
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
    marginBottom: 16,
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
    marginBottom: 16,
  },
  nameSection: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
  },
  sitesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  siteChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  siteChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
  },
});
