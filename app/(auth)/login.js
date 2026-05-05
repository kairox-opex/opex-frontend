import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Image,
  TextInput,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { loginUser, selectAuthLoading, selectAuthError, clearError } from '../../src/store/slices/authSlice';
import Input from '../../src/components/common/Input';
import Button from '../../src/components/common/Button';

// Pre-require images for performance, adjust paths if needed
const logoDark = require('../../assets/images/kaizen_logo_dark.png');
const logoWhite = require('../../assets/images/kaizen_logo_white.jpeg');

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  // ── Entrance Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    setValidationError('');
    dispatch(clearError());

    if (!username.trim()) {
      setValidationError('Username is required');
      return;
    }
    if (!password.trim()) {
      setValidationError('Password is required');
      return;
    }

    try {
      const result = await dispatch(loginUser({ username, password })).unwrap();
      if (result) {
        router.replace('/(main)/(tabs)/chat');
      }
    } catch (err) {
      console.log('Login error:', err);
    }
  };

  const bg = isDark ? '#0F172A' : '#FFFFFF';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const primaryColor = '#3B82F6';
  const inputBg = isDark ? '#334155' : '#F1F5F9';
  const borderColor = isDark ? '#475569' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

      <TouchableOpacity
        style={styles.themeToggle}
        onPress={toggleTheme}
        activeOpacity={0.6}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={24}
          color={subTextColor}
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.staticContent}>
            <View style={styles.mainContent}>
            {/* ── LOGO (OUTSIDE) ── */}
            <Image
              source={isDark ? logoDark : logoWhite}
              style={[
                styles.logoImage, 
                { width: Platform.OS === 'web' ? 220 : width * 1.5 }
              ]}
              resizeMode="contain"
            />

            {/* ── FULL LOGIN CARD ── */}
            <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>

              {/* ── TITLES (INSIDE) ── */}
              <View style={styles.logoHeader}>
                <Text style={[styles.title, { color: textColor }]}>Kairox Ai Opex</Text>
                <Text style={[styles.subtitle, { color: subTextColor }]}>Industrial Issue Tracking</Text>
              </View>

              {/* Username */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: subTextColor }]}>USERNAME</Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="person-outline" size={20} color={subTextColor} style={styles.inputIcon} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[styles.rawInput, { color: textColor }]}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: subTextColor }]}>PASSWORD</Text>
                <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={subTextColor} style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    secureTextEntry={!showPassword}
                    style={[styles.rawInput, { color: textColor }]}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={subTextColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Messages */}
              {(validationError || error) && (
                <View style={[styles.errorContainer, { backgroundColor: `${theme.danger}15` }]}>
                  <Ionicons name="warning" size={18} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validationError || error}
                  </Text>
                </View>
              )}

              {/* Login Button */}
              <Button
                title="Continue"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

            </View>

            <View style={{ height: 40 }} />

            </View>
          </View>
        </ScrollView>
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
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 450, // Constrain content width for web/large screens
    alignSelf: 'center',
  },

  // Header
  logoHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    maxWidth: Platform.OS === 'web' ? 700 : undefined,
    maxHeight: Platform.OS === 'web' ? 200 : undefined,
    aspectRatio: 260 / 100,
    marginBottom: 10,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFFFF', // Ensure background is set
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, // More visible shadow
    shadowRadius: 20,
    elevation: 5,
    marginTop: 10, // Closer to logo
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 10,
  },
  rawInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 1,
  },

  // Button
  loginButton: {
    height: 60,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

