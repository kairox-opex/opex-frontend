/**
 * Real API Service - Connects to PostgreSQL Backend
 * * All API calls to the FastAPI backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { withRetry } from '../utils/networkRetry';
import { uploadImageToImageKit } from './imagekitService';

// Import mocks for stability fallback
import { users as mockUsers } from '../mocks/users';
import { issues as mockIssues } from '../mocks/issues';
import { sites as mockSites } from '../mocks/sites';
import { complaints as mockComplaints } from '../mocks/complaints';

const backendUrl = 'https://api.kairoxaitech.com';
const API_BASE_URL = backendUrl;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/api/v1/auth/login', { phone: username, password });
    const { access_token, user } = response.data;
    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    return { success: true, user: { ...user, avatar: user.avatar_url }, token: access_token };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || 'Invalid credentials' };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/v1/auth/me');
    return { success: true, user: { ...response.data, avatar: response.data.avatar_url } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  return { success: true };
};

export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

export const getStoredUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      return { ...user, avatar: user.avatar_url };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// ==================== ISSUES API (BACKEND) ====================

export const fetchIssues = async (filters = {}) => {
  try {
    const queryParams = { ...filters };
    if (filters.status) queryParams.status_filter = filters.status;
    const response = await api.get('/api/v1/issues', { params: queryParams });
    const data = response.data;
    const items = data.items || data.issues || [];
    const issues = items.map((issue) => ({
      ...issue,
      site: issue.site || { name: issue.site_name || 'Unknown Site' },
      raised_by: issue.raised_by || { name: issue.supervisor_name || 'Supervisor' },
    }));
    return { success: true, issues, next_cursor: data.next_cursor, has_more: data.has_more };
  } catch (error) {
    return { success: false, issues: [] };
  }
};

export const fetchIssueById = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}`);
    const raw = response.data;
    const issue = {
      ...raw,
      site: raw.site || { name: raw.site_name || 'Unknown Site' },
      raised_by: raw.raised_by || { name: raw.supervisor_name || 'Supervisor' },
      images: raw.images || [],
      call_logs: raw.call_logs || [],
    };
    return { success: true, issue };
  } catch (error) {
    return { success: false, error: 'Not found' };
  }
};

export const fetchIssueTimeline = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}/timeline`);
    return { success: true, timeline: response.data?.timeline || [] };
  } catch (error) {
    return { success: false, timeline: [] };
  }
};

// ==================== DASHBOARD API ====================

export const fetchDashboardStats = async () => {
  try {
    const response = await api.get('/api/v1/dashboard/stats');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

// ==================== SUPERVISORS API (TEMPORARY MOCK) ====================

export const fetchSupervisors = async () => {
  console.warn('[BACKEND-GAP] supervisors/list: using temporary mock data');
  const supervisors = mockUsers.filter(u => u.role === 'supervisor');
  return { success: true, supervisors };
};

export const fetchSupervisorById = async (id) => {
  console.warn('[BACKEND-GAP] supervisors/detail: using temporary mock data');
  const supervisor = mockUsers.find(u => String(u.id) === String(id));
  return { success: true, supervisor };
};

// ==================== SITES & OTHERS ====================

export const fetchSites = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    return { success: true, sites: response.data };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

export const fetchComplaints = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/complaints', { params });
    return { success: true, complaints: response.data };
  } catch (error) {
    return { success: false, complaints: [] };
  }
};

export const sendChatMessage = async (text, sessionId, currentIssueId, imageUrl, intent) => {
  try {
    const requestBody = { message: text, session_id: sessionId, issue_id: currentIssueId, image_url: imageUrl, intent: intent };
    const response = await api.post('/api/v1/chat/', requestBody);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false };
  }
};

export default {
  loginUser, getCurrentUser, logoutUser, isAuthenticated, getStoredUser,
  fetchIssues, fetchIssueById, fetchIssueTimeline, fetchDashboardStats,
  fetchSupervisors, fetchSupervisorById, fetchSites, fetchComplaints, sendChatMessage
};