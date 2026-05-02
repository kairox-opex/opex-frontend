import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import Toast from '../../../../src/components/common/Toast';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import Avatar from '../../../../src/components/common/Avatar';

// 📍 IMPORTED NEW ESCALATED THUNK AND PAGINATION SELECTORS
import { 
  fetchEscalatedIssues, 
  selectEscalatedIssues, 
  selectIssuesLoading, 
  setFilters,
  selectIsFetchingNextPage,
  selectHasMoreIssues,
  selectIssuesNextCursor
} from '../../../../src/store/slices/issuesSlice';

export default function EscalatedIssuesScreen() {
  const { theme, isDark } = useTheme(); 
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectEscalatedIssues);
  const loading = useSelector(selectIssuesLoading);
  const isOnline = useSelector(selectIsOnline);
  
  // 📍 NEW PAGINATION SELECTORS
  const isFetchingNextPage = useSelector(selectIsFetchingNextPage);
  const hasMore = useSelector(selectHasMoreIssues);
  const nextCursor = useSelector(selectIssuesNextCursor);
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 📍 INITIAL LOAD
  useEffect(() => {
    if (user) dispatch(fetchEscalatedIssues({}));
  }, [user, dispatch]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText, dispatch]);

  // 📍 PULL TO REFRESH
  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([dispatch(fetchEscalatedIssues({}))]);
      } finally {
        setLastRefresh(Date.now());
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, lastRefresh, dispatch]);

  // 📍 INFINITE SCROLL TRIGGER
  const handleLoadMore = () => {
    if (!isOnline || isFetchingNextPage || !hasMore || loading) return;
    dispatch(fetchEscalatedIssues({ cursor: nextCursor, reset: false }));
  };

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/escalated-detail', params: { id: issue.id } });
  };

  const filteredIssues = issues.filter((issue) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(lowerSearch) ||
      issue.description?.toLowerCase().includes(lowerSearch) ||
      issue.site_name?.toLowerCase().includes(lowerSearch) ||
      issue.id?.toString().includes(lowerSearch)
    );
  });

  const bgColor = isDark ? '#111111' : '#ffffff';
  const surfaceColor = isDark ? '#1a1a1a' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#f0f0f0';
  const escalatedAccent = '#eb4c60'; // Match the pinkish-red from image
  const pillBg = isDark ? '#2a2a2a' : '#f5f5f5';

  if (loading && issues.length === 0 && !refreshing) {
    return <Loader message="Loading escalated issues..." />;
  }

  // Helper to format time (02:14:45 style if possible, else HH:MM:SS)
  const formatTimeElapsed = (dateStr) => {
    if (!dateStr) return '00:00:00';
    const date = new Date(dateStr);
    return date.toTimeString().split(' ')[0]; // Returns HH:MM:SS
  };

  const renderEscalationCard = ({ item: issue, index }) => {
    // In image, the first and 3rd card have red stripe/shield, others have gray.
    // We'll map 'CRITICAL' priority to red, or alternate if no priority exists to match mockup visually.
    const isCritical = issue.priority === 'CRITICAL' || index % 2 === 0;
    
    return (
      <View style={[styles.cardContainer, { backgroundColor: surfaceColor, shadowColor: isDark ? '#000' : '#000' }]}>
        {isCritical && <View style={styles.redStripe} />}
        
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconWrap, { backgroundColor: isCritical ? '#fce8ec' : '#f3f4f6' }]}>
              {isCritical ? (
                <Ionicons name="shield-outline" size={16} color="#eb4c60" />
              ) : (
                <Ionicons name="alert-circle-outline" size={18} color="#4b5563" />
              )}
            </View>
            <View>
              <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={1}>{issue.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                <Text style={[styles.locationText, { color: theme.textSecondary }]}>{issue.site_name}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.idBadge, { backgroundColor: isDark ? '#333' : '#f3f4f6' }]}>
              <Text style={[styles.idText, { color: theme.textSecondary }]}>ESC-{issue.id}</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#eb4c60" />
              <Text style={styles.timeText}>{formatTimeElapsed(issue.updated_at || issue.created_at)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.reasonBox, { backgroundColor: isDark ? '#262626' : '#f9fafb' }]}>
          <View style={styles.reasonHeaderRow}>
            <Ionicons name="flash" size={12} color="#60a5fa" />
            <Text style={styles.reasonLabel}>ESCALATION REASON</Text>
          </View>
          <Text style={[styles.reasonText, { color: theme.textSecondary }]}>
            "{issue.description || 'Reason not provided.'}"
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.solverInfo}>
            <Avatar 
              name={issue.solver_name || 'Unassigned'} 
              uri={issue.solver_name ? `https://i.pravatar.cc/150?u=${issue.id}` : null}
              size="small" 
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.solverLabel}>ASSIGNED SOLVER</Text>
              <Text style={[styles.solverName, { color: issue.solver_name ? theme.text : '#eb4c60' }]}>
                {issue.solver_name || 'Unassigned'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: bgColor }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Escalations</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="funnel-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── LIVE MONITORING SECTION ── */}
      <View style={styles.topSection}>
        <View style={styles.liveMonitorRow}>
          <View style={styles.liveMonitorLeft}>
            <Ionicons name="pulse" size={16} color="#eb4c60" />
            <Text style={[styles.liveMonitorText, { color: theme.textSecondary }]}>LIVE MONITORING</Text>
          </View>
          <View style={styles.systemAlertBadge}>
            <Text style={styles.systemAlertText}>SYSTEM ALERT</Text>
          </View>
        </View>
        <Text style={[styles.activeCount, { color: theme.text }]}>{filteredIssues.length} Active</Text>
      </View>

      {/* ── FILTER CHIPS ── */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[styles.chip, styles.chipActive]}>
            <Text style={styles.chipTextActive}>All Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: pillBg }]}>
            <Text style={[styles.chipText, { color: theme.text }]}>Critical</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: pillBg }]}>
            <Text style={[styles.chipText, { color: theme.text }]}>High Priority</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, { backgroundColor: pillBg }]}>
            <Text style={[styles.chipText, { color: theme.text }]}>Unassigned</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── LIST HEADER ── */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderLeft, { color: theme.textSecondary }]}>PRIORITY RANKING (OLDEST FIRST)</Text>
        <Text style={styles.listHeaderRight}>Last Sync: Just Now</Text>
      </View>

      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.9} onPress={() => handleIssuePress(item)}>
            {renderEscalationCard({ item, index })}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="shield-checkmark-outline" 
            title={searchText ? "No matches found" : "All Clear!"} 
            message={searchText ? `No issues matching "${searchText}"` : "There are no escalated issues requiring your attention."} 
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[escalatedAccent]}
              tintColor={escalatedAccent}
            />
          )
        }
        // 📍 NEW INFINITE SCROLL PROPS
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={escalatedAccent} />
            </View>
          ) : null
        }
      />

      <FullScreenSpinner visible={refreshing} message="Updating Queue..." color={escalatedAccent} />
      {toastMessage !== '' && <Toast message={toastMessage} />}
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
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerRight: { width: 32, alignItems: 'flex-end' },
  filterButton: { padding: 4 },

  topSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  liveMonitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  liveMonitorLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveMonitorText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  systemAlertBadge: { backgroundColor: '#ea6c83', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  systemAlertText: { color: '#ffffff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  activeCount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  chipsContainer: { marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipActive: { backgroundColor: '#3b82f6' },
  chipTextActive: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  chipText: { fontSize: 13, fontWeight: '600' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  listHeaderLeft: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  listHeaderRight: { fontSize: 10, fontWeight: '600', color: '#eb4c60' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  redStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#eb4c60',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', flex: 1, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  issueTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12 },
  
  cardHeaderRight: { alignItems: 'flex-end', marginLeft: 8 },
  idBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  idText: { fontSize: 9, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, fontWeight: '700', color: '#eb4c60' },

  reasonBox: { borderRadius: 12, padding: 12, marginBottom: 16 },
  reasonHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  reasonLabel: { fontSize: 10, fontWeight: '700', color: '#60a5fa', letterSpacing: 0.5 },
  reasonText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  solverInfo: { flexDirection: 'row', alignItems: 'center' },
  solverLabel: { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 2 },
  solverName: { fontSize: 13, fontWeight: '700' },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});