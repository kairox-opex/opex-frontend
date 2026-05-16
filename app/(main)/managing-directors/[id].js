import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fetchMDContactCard, openPersonalThread } from '../../../src/services/api';
import Avatar from '../../../src/components/common/Avatar';

export default function MDProfileScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [md, setMd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const res = await fetchMDContactCard();
      if (res.success && res.md) {
        setMd(res.md);
        
        // FLOW STEP 2: Initialize thread
        const targetId = id === 'md-profile' ? res.md.id : id;
        if (targetId) {
          console.log(`--- FLOW STEP 2: Opening thread with MD ID: ${targetId} ---`);
          await openPersonalThread(targetId);
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, [id]);

  const onCall = () => {
    if (md?.phone) {
      Linking.openURL(`tel:${md.phone}`).catch(() => {});
    }
  };

  const onWhatsApp = () => {
    if (md?.phone) {
      Linking.openURL(`whatsapp://send?phone=${md.phone}`).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MD Profile</Text>
        <TouchableOpacity onPress={() => router.push(`/chat/personal/${md?.id}`)}>
          <Ionicons name="chatbubble-ellipses" size={22} color={isDark ? '#ffffff' : theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Avatar name={md?.name} uri={md?.avatar} size={88} />
          <Text style={[styles.name, { color: theme.text }]}>{md?.name || 'Managing Director'}</Text>
          <Text style={[styles.roleText, { color: theme.primary }]}>{md?.role || 'Managing Director'}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{md?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{md?.phone || 'N/A'}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onCall}>
              <Ionicons name="call" size={18} color={theme.text} />
              <Text style={[styles.actionText, { color: theme.text }]}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={onWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  profileCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
  },
  name: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  roleText: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  infoText: { fontSize: 14 },
  actionsRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 24,
    width: '100%',
    justifyContent: 'center'
  },
  actionBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionText: { fontSize: 14, fontWeight: '600' },
});
