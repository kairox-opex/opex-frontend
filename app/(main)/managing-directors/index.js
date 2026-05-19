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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fetchMDContactCard, fetchPersonalThreads } from '../../../src/services/api';
import Avatar from '../../../src/components/common/Avatar';
import EmptyState from '../../../src/components/common/EmptyState';

export default function ManagingDirectorsListScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

 const [mdList, setMdList] = useState([]);
 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // FLOW STEP 1: Fetch threads to prepare chat system
    console.log('--- FLOW STEP 1: Fetching Personal Threads for MD List ---');
    await fetchPersonalThreads();

    // Fetch the MD details
    const res = await fetchMDContactCard();
    console.log('--- MD LIST API RESPONSE ---', res);
    
    if (res.success && res.md) {
      // If res.md is an array, use it directly. Otherwise wrap it.
      setMdList(Array.isArray(res.md) ? res.md : [res.md]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderMDItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.mdCard, { backgroundColor: isDark ? '#1c1c1c' : '#ffffff', borderColor: isDark ? '#2e2e2e' : '#f1f5f9' }]}
      onPress={() => {
        console.log('--- NAVIGATING TO MD PROFILE WITH ID:', item.id, '---');
        router.push(`/managing-directors/${item.id || 'md-profile'}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={item.avatar} name={item.name} size="medium" />
        <View style={styles.nameSection}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>{item.role || 'Managing Director'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Managing Director List</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={mdList}
        keyExtractor={(item, index) => (item.id || index).toString()}
        renderItem={renderMDItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
          ) : (
            <EmptyState
              icon="person-outline"
              title="No MD Found"
              message="Managing Director details are not available at the moment."
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },
  listContent: { padding: 16 },
  mdCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  nameSection: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  email: { fontSize: 12 },
});
