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
  fetchCustomerMDs,
  selectAllCustomerMDs,
  selectCustomerMDsLoading
} from '../../../src/store/slices/customerMDSlice';
import Avatar from '../../../src/components/common/Avatar';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { backToDashboard } from '../../../src/utils/navigation';

export default function CustomerMDCardRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const customerMDs = useSelector(selectAllCustomerMDs);
  const loading = useSelector(selectCustomerMDsLoading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomerMDs());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchCustomerMDs());
    setRefreshing(false);
  };

  const renderCMDItem = ({ item }) => {
    const hasPending = item.pending_escalations > 0;
    
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: isDark ? '#1c1c1c' : '#ffffff', borderColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}
        onPress={() => router.push(`/customer-mds/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Avatar uri={item.avatar_url || item.avatar} name={item.name} size="medium" />
            {hasPending && <View style={styles.alertBadge} />}
          </View>
          
          <View style={styles.nameSection}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <View style={styles.sitesWrapper}>
              {item.sites?.slice(0, 2).map((site, index) => (
                <View key={index} style={[styles.siteChip, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
                  <Text style={[styles.siteChipText, { color: '#3b82f6' }]} numberOfLines={1}>
                    {typeof site === 'object' ? site.name : `Site ${site}`}
                  </Text>
                </View>
              ))}
              {item.sites?.length > 2 && (
                <Text style={[styles.moreText, { color: theme.textSecondary }]}>+{item.sites.length - 2} more</Text>
              )}
            </View>
          </View>

          <View style={[styles.escalationBadge, { backgroundColor: hasPending ? '#fee2e2' : (isDark ? '#262626' : '#f3f4f6') }]}>
            <Text style={[styles.escalationCount, { color: hasPending ? '#ef4444' : theme.textSecondary }]}>
              {item.pending_escalations || 0}
            </Text>
            <Text style={[styles.escalationLabel, { color: hasPending ? '#ef4444' : theme.textSecondary }]}>PENDING</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <RoleGuard action="view:customerMDCard">
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: isDark ? '#111' : '#f9fafb' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: isDark ? '#111' : '#ffffff', borderBottomColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}>
          <TouchableOpacity onPress={backToDashboard} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>MD Team — Customer MDs</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={customerMDs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCMDItem}
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
                <Ionicons name="business-outline" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No Customer MDs Found</Text>
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
  card: {
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
  avatarWrap: {
    position: 'relative',
  },
  alertBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
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
  escalationBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 55,
  },
  escalationCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  escalationLabel: {
    fontSize: 7,
    fontWeight: '700',
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
