import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../src/theme/ThemeContext';
import { backToDashboard } from '../../src/utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Coming Soon — premium placeholder screen for features under development.
 *
 * Route: /(main)/coming-soon?feature=Monthly%20Report
 *
 * Accepts an optional `feature` query param to personalise the title.
 * Existing screens (monthly-report.js, admin/index.js, etc.) are NOT removed.
 */
export default function ComingSoonScreen() {
  const { theme, isDark } = useTheme();
  const { feature } = useLocalSearchParams();

  const featureLabel = feature || 'This Feature';

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Continuous pulse on the icon ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle icon wiggle
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: -1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const iconSpin = iconRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const bgPrimary = isDark ? '#0b0f14' : '#f4f4f6';
  const cardBg = isDark ? '#141a23' : '#ffffff';
  const cardBorder = isDark ? '#1f2937' : '#e5e7eb';
  const gradientStart = isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)';
  const accentColor = '#3b82f6';

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: bgPrimary }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: cardBorder }]}>
        <TouchableOpacity onPress={backToDashboard} testID="coming-soon-back" hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{featureLabel}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* ── Content ── */}
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideUp },
              ],
            },
          ]}
        >
          {/* Decorative glow behind icon */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                backgroundColor: gradientStart,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
                transform: [{ rotate: iconSpin }, { scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons name="rocket-outline" size={40} color={accentColor} />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>Coming Soon</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {featureLabel} is currently under development. We're working hard to bring you
            something amazing!
          </Text>

          {/* Feature pill */}
          <View style={[styles.featurePill, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe' }]}>
            <Ionicons name="hammer-outline" size={13} color={accentColor} />
            <Text style={[styles.featurePillText, { color: accentColor }]}>
              In Active Development
            </Text>
          </View>

          {/* Status indicators */}
          <View style={styles.statusRow}>
            <View style={[styles.statusItem, { backgroundColor: isDark ? '#1a1a2e' : '#f0fdf4' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#10a37f" />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>Designed</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: isDark ? '#1a1a2e' : '#fffbeb' }]}>
              <Ionicons name="code-working" size={16} color="#f59e0b" />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>Building</Text>
            </View>
            <View style={[styles.statusItem, { backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9' }]}>
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>Testing</Text>
            </View>
          </View>
        </Animated.View>

        {/* Back to dashboard button */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUp }] }}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: accentColor }]}
            onPress={backToDashboard}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={16} color="#ffffff" />
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  // glowRing: {
  //   position: 'absolute',
  //   top: -40,
  //   width: 200,
  //   height: 200,
  //   borderRadius: 100,
  // },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
