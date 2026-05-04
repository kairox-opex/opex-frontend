/**
 * Real API Service - Connects to PostgreSQL Backend
 * * All API calls to the FastAPI backend
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { withRetry } from '../utils/networkRetry';
import { uploadImageToImageKit } from './imagekitService';

const backendUrl = 'https://api.kairoxaitech.com';


const API_BASE_URL = backendUrl;

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000000000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
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
    return {
      success: true,
      user: {
        ...response.data,
        avatar: response.data.avatar_url,
      },
    };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || 'Failed to get user' };
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

// ==================== ISSUES API ====================

export const fetchIssues = async (filters = {}) => {
  console.log('\n📋 ─── FETCH ISSUES ───');
  try {
    const queryParams = {};
    if (filters.status) queryParams.status_filter = filters.status;
    if (filters.priority) queryParams.priority = filters.priority;
    if (filters.site_id) queryParams.site_id = filters.site_id;
    if (filters.search) queryParams.search = filters.search;
    queryParams.limit = filters.limit || 10;
    if (filters.cursor) queryParams.cursor = filters.cursor;

    console.log('🌐 [Network] GET /api/v1/issues', queryParams);
    const response = await api.get('/api/v1/issues', { params: queryParams });
    const data = response.data;
    
    const rawItems = data.items || data.issues || [];
    const issues = rawItems.map((issue) => ({
      ...issue,
      site: issue.site || { name: issue.site_name || 'Unknown Site' },
      raised_by: issue.raised_by || { name: issue.supervisor_name || 'Supervisor' },
    }));
    
    return { success: true, issues, next_cursor: data.next_cursor || null, has_more: data.has_more ?? false };
  } catch (error) {
    console.error('❌ FETCH ISSUES FAILED:', error.message);
    return { success: false, error: error.response?.data?.detail || 'Failed to fetch issues' };
  }
};

export const fetchIssueById = async (issueId) => {
  console.log(`\n🔎 ─── FETCH ISSUE DETAIL [${issueId}] ───`);
  try {
    const response = await api.get(`/api/v1/issues/${issueId}`);
    const raw = response.data;
    const issue = {
      ...raw,
      site: raw.site || { name: raw.site_name || 'Unknown Site' },
      raised_by: raw.raised_by || {
        name: raw.supervisor_name || 'Supervisor',
        avatar: raw.raised_by?.avatar_url || null,
      },
      images: raw.images || [],
      call_logs: raw.call_logs || [],
      complaints_count: raw.complaints_count ?? 0,
    };
    return { success: true, issue };
  } catch (error) {
    return { success: false, error: 'Issue not found' };
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
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
};

// ==================== COMPLAINTS API ====================

export const fetchComplaints = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/complaints', { params });
    return { success: true, complaints: response.data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch complaints' };
  }
};

export const fetchComplaintById = async (id) => {
  const response = await api.get(`/api/v1/complaints/${id}`);
  return response.data;
};

// ==================== SITES API ====================

export const fetchSites = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    return { success: true, sites: response.data };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

export const fetchSitesAnalytics = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    return { success: true, sites: response.data };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

export const fetchSiteAnalyticsById = async (siteId) => {
  try {
    const response = await api.get(`/api/v1/sites/analytics/${siteId}`);
    return { success: true, site: response.data };
  } catch (error) {
    return { success: false, site: null };
  }
};

// ==================== SUPERVISORS API ====================

export const fetchSupervisors = async () => {
  console.log('\n👥 ─── FETCH SUPERVISORS ───');
  try {
    const response = await api.get('/api/v1/supervisors');
    const items = response.data?.items || response.data || [];
    return { success: true, supervisors: items };
  } catch (error) {
    return { success: false, supervisors: [], error: error.response?.data?.detail || 'Failed' };
  }
};

export const fetchSupervisorById = async (id) => {
  try {
    const response = await api.get(`/api/v1/supervisors/${id}`);
    return { success: true, supervisor: response.data };
  } catch (error) {
    return { success: false, supervisor: null };
  }
};

export const fetchSolversPerformanceAPI = async () => {
  try {
    const response = await api.get('/api/v1/solvers/performance');
    return { success: true, solvers: response.data };
  } catch (error) {
    return { success: false, solvers: [] };
  }
};

// ==================== CHATBOT API ====================

export const sendChatMessage = async (text, sessionId = null, currentIssueId = null, imageUrl = null, intent = null) => {
  try {
    const requestBody = {
      message: text,
      session_id: sessionId,
      issue_id: currentIssueId,
      image_url: imageUrl,
      intent: intent,
    };
    const response = await api.post('/api/v1/chat/', requestBody);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: "Failed" };
  }
};

export const sendChatWithImage = async ({ text, sessionId, imageUri, intent, currentIssueId = null }) => {
  try {
    const chatRes = await sendChatMessage(text, sessionId, currentIssueId, imageUri, intent);
    return chatRes;
  } catch (error) {
    return { success: false };
  }
};

export default {
  loginUser, getCurrentUser, logoutUser, isAuthenticated, getStoredUser,
  fetchIssues, fetchIssueById, fetchIssueTimeline, fetchDashboardStats,
  fetchComplaints, fetchSites, fetchSupervisors, fetchSupervisorById,
  sendChatMessage, sendChatWithImage
};