import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  TextInput,
  useWindowDimensions,
  StatusBar,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import {
  loginUser,
  selectAuthLoading,
  selectAuthError,
  clearError
} from '../../src/store/slices/authSlice';

// Assets
const logoDark = require('../../assets/images/kaizen_logo_dark.png');
const logoWhite = require('../../assets/images/kaizen_logo_white.jpeg');

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const isTablet = (w) => w >= 600;
const isDesktop = (w) => w >= 1024;

// ─── Floating Orb Background Component ─────────────────────────────────────────
function Orb({ x, y, size, color, duration, delay, moveRange = 40 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating movement
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    // Subtle rotation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: duration * 2, easing: Easing.linear, useNativeDriver: true })
    );

    const t = setTimeout(() => {
      float.start();
      rotate.start();
    }, delay);

    return () => { clearTimeout(t); float.stop(); rotate.stop(); };
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -moveRange] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-moveRange / 2, moveRange / 2] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.45, 0.2] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
      }}
    />
  );
}

// ─── Floating Particles ──────────────────────────────────────────────────────
function Particle({ x, y, delay, duration, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => drift.start(), delay);
    return () => { clearTimeout(t); drift.stop(); };
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        width: 3, height: 3, borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Animated Input Field Component ───────────────────────────────────────────
function Field({ label, icon, value, onChangeText, placeholder, secureTextEntry, colors, inputH, rightAction, entryDelay }) {
  const [focused, setFocused] = useState(false);
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: entryDelay, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: entryDelay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 250, useNativeDriver: false }).start();
  }, [focused]);

  const animBorderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.text] });
  const animBorderWidth = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [1.5, 2] });

  return (
    <Animated.View style={{ marginBottom: 20, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
      <Animated.View style={[
        styles.fieldRow,
        {
          height: inputH,
          backgroundColor: colors.inputBg,
          borderColor: animBorderColor,
          borderWidth: animBorderWidth,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: focused ? 0.2 : 0,
          shadowRadius: focused ? 12 : 0,
          elevation: focused ? 4 : 0,
        },
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={focused ? colors.text : colors.icon}
          style={styles.fieldIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.fieldInput, { color: colors.text }]}
        />
        {rightAction}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Loading Dot Animation ───────────────────────────────────────────────────
function LoadingDots({ color }) {
  const anims = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(400),
        ])
      ).start();
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ translateY: anim }] }} />
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isTab = isTablet(width);
  const isDesk = isDesktop(width);

  // ─── Color Palette ─────────────────────────────────────────────────────────
  const C = {
    bg: isDark ? '#0F172A' : '#FFFFFF',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(226, 232, 240, 0.8)',
    text: isDark ? '#F1F5F9' : '#0F172A',
    subText: isDark ? '#94A3B8' : '#64748B',
    placeholder: isDark ? '#475569' : '#94A3B8',
    icon: isDark ? '#64748B' : '#94A3B8',
    primary: '#3B82F6',
    primaryDeep: '#2563EB',
    inputBg: isDark ? '#334155' : '#F1F5F9',
    border: isDark ? '#475569' : '#E2E8F0',
    danger: '#EF4444',
    dangerBg: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    orb1: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.6)',
    orb2: isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(241, 245, 249, 0.8)',
    orb3: isDark ? 'rgba(71, 85, 105, 0.15)' : 'rgba(226, 232, 240, 0.7)',
  };

  // ─── Entrance & Idle Animations ──────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnRotateX = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(logoScale, { toValue: 1, duration: 800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
    ]).start();

    // Idle logo pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => pulse.start(), 1000);
    return () => { clearTimeout(t); pulse.stop(); };
  }, []);

  // Shake animation on error
  useEffect(() => {
    if (validationError || error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [validationError, error]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true, friction: 4 }),
      Animated.spring(btnRotateX, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.spring(btnRotateX, { toValue: 0, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const handleLogin = async () => {
    setValidationError('');
    dispatch(clearError());
    if (!username.trim()) { setValidationError('Username is required'); return; }
    if (!password.trim()) { setValidationError('Password is required'); return; }
    try {
      const result = await dispatch(loginUser({ username, password })).unwrap();
      if (result) router.replace('/(main)/(tabs)/chat');
    } catch (err) {
      console.log('Login error:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Background Orbs & Particles ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Large Orbs */}
        <Orb x={-100} y={-50} size={300} color={C.orb1} duration={6000} delay={0} moveRange={50} />
        <Orb x={width - 150} y={height / 2.5} size={250} color={C.orb2} duration={7000} delay={500} moveRange={60} />
        <Orb x={50} y={height - 200} size={200} color={C.orb3} duration={6500} delay={1000} moveRange={40} />
        <Orb x={width / 2} y={height / 6} size={150} color={C.orb1} duration={5500} delay={1500} moveRange={30} />

        {/* Drifting Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Particle
            key={i}
            x={Math.random() * width}
            y={Math.random() * height}
            delay={Math.random() * 2000}
            duration={3000 + Math.random() * 3000}
            color={isDark ? '#3B82F6' : '#94A3B8'}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme} activeOpacity={0.7}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={C.subText} />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.innerWrapper}>
          <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── Logo Section ── */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
              <Animated.Image
                source={isDark ? logoDark : logoWhite}
                style={[
                  styles.logoImage,
                  { transform: [{ scale: logoPulse }] },
                  // Only apply multiply on web/light mode to hide JPEG white background
                  // (Note: works on web, might not be supported on all mobile versions)
                  !isDark && { mixBlendMode: 'multiply' }
                ]}
                resizeMode="contain"
              />
            </Animated.View>

            {/* ── Login Card ── */}
            <Animated.View style={[
              styles.card,
              {
                backgroundColor: C.cardBg,
                borderColor: C.cardBorder,
                transform: [{ translateX: shakeAnim }]
              }
            ]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, { color: C.text }]}>Kairox Ai Opex</Text>
                <Text style={[styles.subtitle, { color: C.subText }]}>Industrial Intelligence System</Text>
              </View>

              <View style={styles.form}>
                <Field
                  label="ID / USERNAME"
                  icon="person-outline"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. admin_01"
                  colors={C}
                  inputH={56}
                  entryDelay={400}
                />
                <Field
                  label="SECURITY ACCESS"
                  icon="shield-checkmark-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  colors={C}
                  inputH={56}
                  entryDelay={550}
                  rightAction={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={C.icon} />
                    </TouchableOpacity>
                  }
                />

                {/* Error Messages */}
                {(validationError || error) && (
                  <Animated.View style={[styles.errorBox, { backgroundColor: C.dangerBg }]}>
                    <Ionicons name="alert-circle" size={18} color={C.danger} />
                    <Text style={[styles.errorText, { color: C.danger }]}>{validationError || error}</Text>
                  </Animated.View>
                )}

                {/* Login Button */}
                <Animated.View
                  style={{
                    transform: [
                      { scale: btnScale },
                      { perspective: 1000 },
                      { rotateX: btnRotateX.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '15deg'] }) }
                    ]
                  }}
                >
                  <TouchableOpacity
                    onPress={handleLogin}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
                    disabled={loading}
                    style={[
                      styles.loginButton,
                      {
                        backgroundColor: C.primary,
                        shadowOffset: { width: 0, height: 6 }
                      }
                    ]}
                  >
                    {loading ? (
                      <LoadingDots color="#FFF" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.buttonText}>Secure Login</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={styles.footer}>
                <Ionicons name="lock-closed-outline" size={12} color={C.subText} style={{ marginRight: 6 }} />
                <Text style={[styles.footerText, { color: C.subText }]}>Authorized Personnel Only</Text>
              </View>
            </Animated.View>

          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    borderRadius: 12,
  },
  innerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    ...Platform.select({
      ios: { paddingBottom: 80 },
      android: { paddingBottom: 55 },
      web: { paddingBottom: 0 }
    })
  },
  mainContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  logoContainer: {
    marginTop: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 260,
    height: 100,
    ...Platform.select({
      web: {
        width: 500,
        height: 220,
      },
      android: {
        width: 300,
        height: 160,

      },
      ios: {
        width: 300,
        height: 160,
      },
    }),
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    padding: 30,
    borderRadius: 30,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  fieldIcon: {
    width: 20,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    // Fix for web black focus outline
    ...Platform.select({
      web: { outlineWidth: 0 }
    })
  },
  eyeIcon: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  loginButton: {
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
