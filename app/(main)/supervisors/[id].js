import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/theme/ThemeContext';
import Avatar from '../../../src/components/common/Avatar';
import { fetchSupervisorById } from '../../../src/services/api';
import { issues as mockIssues } from '../../../src/mocks/issues';
import { sites as mockSites } from '../../../src/mocks/sites';

export default function SupervisorDetailScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [supervisor, setSupervisor] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      const res = await fetchSupervisorById(id);
      if (res.success) {
        setSupervisor(res.supervisor);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!supervisor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Supervisor Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate statistics from mock data for stability
  const handledIssues = mockIssues.filter((i) => i.raised_by_supervisor_id === supervisor.id);
  const activeCount = handledIssues.filter((i) =>
    ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'].includes(i.status)
  ).length;
  const closedCount = handledIssues.filter((i) => i.status === 'COMPLETED').length;
  const siteIds = supervisor.sites || [];
  const assignedSites = siteIds
    .map((sid) => mockSites.find((s) => s.id === sid))
    .filter(Boolean);

  const stats = [
    { label: 'Active Issues', value: activeCount, icon: 'alert-circle-outline', color: '#f59e0b' },
    { label: 'Closed Issues', value: closedCount, icon: 'checkmark-circle-outline', color: '#10b981' },
    { label: 'Assigned Sites', value: assignedSites.length, icon: 'business-outline', color: '#3b82f6' },
    { label: 'Total Raised', value: handledIssues.length, icon: 'document-text-outline', color: '#6366f1' },
  ];

  // Premium Palette
  const bgColor = isDark ? '#111111' : '#f9fafb';
  const surfaceColor = isDark ? '#1c1c1c' : '#ffffff';
  const borderColor = isDark ? '#2e2e2e' : '#f1f5f9';
  const blueBadgeBg = isDark ? 'rgba(56,189,248,0.15)' : '#e0f2fe';
  const blueBadgeText = isDark ? '#38bdf8' : '#0284c7';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: surfaceColor }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Supervisor Profile</Text>
        <TouchableOpacity 
          style={styles.chatButton} 
          onPress={() => router.push(`/chat/personal/${supervisor.id}`)}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: bgColor }]} showsVerticalScrollIndicator={false}>
        
        {/* ── PROFILE IDENTITY ── */}
        <View style={[styles.profileSection, { backgroundColor: surfaceColor }]}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={supervisor.avatar} name={supervisor.name} size="xlarge" />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{supervisor.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: blueBadgeBg }]}>
            <Text style={[styles.roleText, { color: blueBadgeText }]}>SUPERVISOR</Text>
          </View>
          <Text style={styles.empIdText}>EMP-{supervisor.id}-OPS</Text>
        </View>

        {/* ── STATISTICS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="stats-chart-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERFORMANCE SUMMARY</Text>
          </View>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={[styles.statCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── ASSIGNED SITES ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="business-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ASSIGNED SITES</Text>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor }]}>
            {assignedSites.length > 0 ? (
              assignedSites.map((site, index) => (
                <View key={site.id}>
                  <TouchableOpacity 
                    style={styles.siteRow} 
                    onPress={() => router.push(`/(main)/projectflow/${site.id}`)}
                  >
                    <View style={[styles.siteIconCircle, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="location" size={18} color={theme.primary} />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={[styles.infoValue, { color: theme.text }]}>{site.name}</Text>
                      <Text style={styles.infoLabel}>{site.location}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {index < assignedSites.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: borderColor }]} />
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No sites assigned.</Text>
            )}
          </View>
        </View>

        {/* ── CONTACT INFORMATION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CONTACT INFORMATION</Text>
          </View>
          <View style={[styles.infoContainer, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: blueBadgeBg }]}>
                <Ionicons name="mail-outline" size={18} color={blueBadgeText} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Work Email</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{supervisor.email}</Text>
              </View>
            </View>
            <View style={[styles.separator, { backgroundColor: borderColor }]} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIconCircle, { backgroundColor: blueBadgeBg }]}>
                <Ionicons name="call-outline" size={18} color={blueBadgeText} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{supervisor.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginLeft: -4 },
  chatButton: { padding: 4, marginRight: -4 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  content: { flex: 1 },
  
  profileSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  avatarWrapper: { position: 'relative' },
  name: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 16, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  empIdText: { fontSize: 10, color: '#9ca3af', marginTop: 10, fontWeight: '600', letterSpacing: 1.5 },
  
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.0 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  
  infoContainer: { borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  siteRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  siteIconCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  emptyText: { padding: 20, textAlign: 'center', fontSize: 13 },
  
  bottomPadding: { height: 60 },
});
