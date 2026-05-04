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
  timeout: 30000000000, // 50 minutes - increase for long-running requests
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
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

import { users as mockUsers } from '../mocks/users';
import { issues as mockIssues } from '../mocks/issues';
import { sites as mockSites } from '../mocks/sites';
import { complaints as mockComplaints } from '../mocks/complaints';

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

/**
 * Get current authenticated user
 */
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
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to get user',
    };
  }
};

/**
 * Logout user - clear stored credentials
 */
export const logoutUser = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  return { success: true };
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return !!token;
};

/**
 * Get stored user from AsyncStorage
 */
export const getStoredUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (userJson) {
      const user = JSON.parse(userJson);
      return {
        ...user,
        avatar: user.avatar_url,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};

// ==================== ISSUES API ====================

/**
 * Fetch all issues using Cursor-Based Pagination
 */
export const fetchIssues = async (filters = {}) => {
  console.log('\n📋 ─── FETCH ISSUES ───');
  
  // ENRICHED MOCK LOGIC (Fallback - Active for stability)
  console.warn('[BACKEND-GAP] issues/list: using enriched mock issues');
  await new Promise((r) => setTimeout(r, 180));

  let filtered = [...mockIssues];
  
  const storedUserRaw = await AsyncStorage.getItem('auth_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const role = user?.role;

  if (role === 'problem_solver' || role === 'problemsolver') {
    filtered = filtered.filter((i) => {
      const isAssigned = i.status !== 'OPEN';
      const solverId = (i.id % 5) + 6;
      return isAssigned && solverId === user?.id;
    });
  }

  if (filters.status) filtered = filtered.filter((i) => i.status === filters.status);
  if (filters.priority) filtered = filtered.filter((i) => i.priority === filters.priority);
  if (filters.site_id) filtered = filtered.filter((i) => i.site_id === filters.site_id);
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    filtered = filtered.filter((i) => (i.title || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }

  const issuesOut = filtered.map((issue) => {
    const site = mockSites.find((s) => s.id === issue.site_id);
    const solverId = (issue.id % 5) + 6;
    const supervisorId = (issue.id % 3) + 1;
    const solver = mockUsers.find(u => u.id === solverId);
    const supervisor = mockUsers.find(u => u.id === supervisorId);
    const isAssigned = issue.status !== 'OPEN';

    return {
      ...issue,
      site_name: site?.name || issue.site_name || `Site ${issue.site_id}`,
      site_location: site?.location || issue.site_location || null,
      site: site || { name: issue.site_name || `Site ${issue.site_id}` },
      assigned_to_id: isAssigned ? solverId : null,
      assigned_to_name: isAssigned ? solver?.name : null,
      assigned_to_avatar: isAssigned ? solver?.avatar : null,
      assigned_to_role: isAssigned ? 'Problem Solver' : null,
      supervisor_name: supervisor?.name || 'System',
      supervisor_avatar: supervisor?.avatar || null,
      supervisor_role: 'Supervisor',
      raised_by: { name: supervisor?.name || 'System', avatar: supervisor?.avatar || null, role: 'Supervisor' },
    };
  });

  return { success: true, issues: issuesOut, next_cursor: null, has_more: false };
};

/**
 * Fetch single issue by ID
 */
export const fetchIssueById = async (issueId) => {
  console.log(`\n🔎 ─── FETCH ISSUE DETAIL [${issueId}] ───`);
  console.warn(`[BACKEND-GAP] issues/detail: using enriched mock issues for id=${issueId}`);
  await new Promise((r) => setTimeout(r, 180));

  const raw = mockIssues.find((i) => String(i.id) === String(issueId));
  if (!raw) return { success: false, error: 'Issue not found' };

  const site = mockSites.find((s) => s.id === raw.site_id);
  const solverId = (raw.id % 5) + 6;
  const supervisorId = (raw.id % 3) + 1;
  const solver = mockUsers.find(u => u.id === solverId);
  const supervisor = mockUsers.find(u => u.id === supervisorId);
  const isAssigned = raw.status !== 'OPEN';

  const issue = {
    ...raw,
    site_name: site?.name || raw.site_name || `Site ${raw.site_id}`,
    site_location: site?.location || raw.site_location || null,
    site: site || { name: raw.site_name || `Site ${raw.site_id}` },
    assigned_to_id: isAssigned ? solverId : null,
    assigned_to_name: isAssigned ? solver?.name : null,
    assigned_to_avatar: isAssigned ? solver?.avatar : null,
    assigned_to_role: isAssigned ? 'Problem Solver' : null,
    supervisor_name: supervisor?.name || 'System',
    supervisor_avatar: supervisor?.avatar || null,
    supervisor_role: 'Supervisor',
    raised_by: { name: supervisor?.name || 'System', avatar: supervisor?.avatar || null, role: 'Supervisor' },
    images: raw.images || [],
    call_logs: raw.call_logs || [],
    complaints_count: raw.complaints_count || 0,
  };
  return { success: true, issue };
};

/**
 * Fetch issue timeline
 */
export const fetchIssueTimeline = async (issueId) => {
  try {
    const response = await api.get(`/api/v1/issues/${issueId}/timeline`);
    const timeline = response.data?.timeline || response.data?.items || response.data || [];
    return { success: true, timeline: Array.isArray(timeline) ? timeline : [] };
  } catch (error) {
    return { success: false, timeline: [] };
  }
};

// ==================== DASHBOARD API ====================
export const fetchDashboardStats = async () => {
  console.warn('[BACKEND-GAP] dashboard/stats: using mock aggregates');
  await new Promise((r) => setTimeout(r, 180));
  const storedUserRaw = await AsyncStorage.getItem(USER_KEY);
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const role = user?.role;
  const countByStatus = (list, arr) => list.filter((i) => arr.includes(i.status)).length;

  if (role === 'problem_solver') {
    const assigned = mockIssues.slice(0, 6);
    return {
      success: true,
      data: {
        isSolverView: true,
        stats: { totalIssues: assigned.length, notFixedIssues: countByStatus(assigned, ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED']), fixedIssues: countByStatus(assigned, ['COMPLETED']), complaints: mockComplaints.filter((c) => c.target_solver_id === user?.id).length },
        recentIssues: assigned.slice(0, 5).map((a) => ({ id: a.id, title: a.title, site_name: mockSites.find((s) => s.id === a.site_id)?.name || '—', priority: a.priority, status: a.status, created_at: a.deadline_at || a.created_at })),
      },
    };
  }

  const totalIssues = mockIssues.length;
  return {
    success: true,
    data: {
      isSolverView: false,
      stats: { totalIssues, notFixedIssues: countByStatus(mockIssues, ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED']), fixedIssues: countByStatus(mockIssues, ['COMPLETED']), complaints: mockComplaints.length },
      rawSummary: { total_issues: totalIssues, completed_issues: countByStatus(mockIssues, ['COMPLETED']) },
      alerts: { escalations: countByStatus(mockIssues, ['ESCALATED']), deadlines: mockIssues.filter((i) => new Date(i.deadline_at) < new Date() && !['COMPLETED'].includes(i.status)).length, pendingReviews: 3 },
      recentIssues: mockIssues.slice(0, 5),
      mySites: mockSites,
    },
  };
};

// ==================== COMPLAINTS API ====================
export const fetchComplaints = async ({ cursor = null, limit = 20, status = null, search = null } = {}) => {
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await api.get('/api/v1/complaints', { params });
    const data = response.data || {};
    return { success: true, complaints: { items: data.items || data.complaints || [], next_cursor: data.next_cursor || null, has_more: data.has_more ?? false } };
  } catch (error) {
    return { success: false, error: 'Failed to fetch complaints', complaints: { items: [], next_cursor: null, has_more: false } };
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
    const sites = Array.isArray(response.data) ? response.data : (response.data?.sites || response.data?.items || []);
    return { success: true, sites };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

export const fetchSitesAnalytics = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    const sites = Array.isArray(response.data) ? response.data : (response.data?.sites || response.data?.items || []);
    return { success: true, sites };
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
  // Reverted to Mock for stability
  console.warn('[BACKEND-GAP] supervisors/list: using mock data');
  const supervisors = mockUsers.filter(u => u.role === 'supervisor');
  return { success: true, supervisors };
};

export const fetchSupervisorById = async (id) => {
  // Reverted to Mock for stability
  console.warn('[BACKEND-GAP] supervisors/detail: using mock data');
  const supervisor = mockUsers.find(u => String(u.id) === String(id));
  return { success: true, supervisor };
};

export const fetchSolversPerformanceAPI = async () => {
  console.warn('[BACKEND-GAP] solvers/performance: using mock solver list');
  const solvers = mockUsers.filter((u) => u.role === 'problem_solver').map((u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, avatar_url: u.avatar, skill: u.skill, total_assigned: 5, completed: 3, pending: 2, rating: '4.5' }));
  return { success: true, solvers };
};

// ==================== CHATBOT API ====================
export const sendChatMessage = async (text, sessionId = null, currentIssueId = null, imageUrl = null, intent = null) => {
  try {
    const requestBody = { message: text, session_id: sessionId, issue_id: currentIssueId, image_url: imageUrl, metadata: { platform: Platform.OS, timestamp: new Date().toISOString() }, intent: intent };
    const response = await api.post('/api/v1/chat/', requestBody);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: "Failed to send message" };
  }
};

export const sendChatWithImage = async ({ text, sessionId, imageUri, intent, currentIssueId = null }) => {
  try {
    const chatRes = await sendChatMessage(text, sessionId, currentIssueId, imageUri, intent);
    if (!chatRes.success) return chatRes;
    const rawData = chatRes.data || {};
    const issueId = rawData.issue_id || rawData.data?.issue_id || currentIssueId;
    if (imageUri && issueId) {
      let imageType = intent === "complete_work" ? "AFTER" : "BEFORE";
      const imageUrl = await uploadImageToImageKit(imageUri, issueId, imageType);
      await api.post('/api/v1/images/save', { image_url: imageUrl, issue_id: issueId, image_type: imageType });
    }
    return chatRes;
  } catch (error) {
    return { success: false };
  }
};

export const fetchChatSessions = async () => {
  const response = await api.get('/api/v1/chat/sessions');
  return { success: true, sessions: response.data.sessions };
};

export const fetchSessionDetail = async (sessionId) => {
  const response = await api.get(`/api/v1/chat/sessions/${sessionId}`);
  return { success: true, session: response.data };
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return { success: true, ...response.data };
};

export const fetchPendingIssuesCard = async (params = {}) => {
  const response = await api.get('/api/v1/dashboard-cards/pending-issues', { params });
  return { success: true, data: response.data };
};

export const fetchResolvedIssuesCard = async (params = {}) => {
  const response = await api.get('/api/v1/dashboard-cards/resolved', { params });
  return { success: true, data: response.data };
};

export const fetchEscalatedIssuesCard = async (params = {}) => {
  const response = await api.get('/api/v1/dashboard-cards/escalated', { params });
  return { success: true, data: response.data };
};

export const fetchResolvedPendingIssuesCard = async (params = {}) => {
  const response = await api.get('/api/v1/dashboard-cards/resolved-pending-review', { params });
  return { success: true, data: response.data };
};

export const fetchDashboardCardIssueDetail = async (cardType, issueId) => {
  const response = await api.get(`/api/v1/dashboard-cards/${cardType}/${issueId}`);
  return { success: true, issue: response.data };
};

export default {
  loginUser, getCurrentUser, logoutUser, isAuthenticated, getStoredUser,
  fetchIssues, fetchIssueById, fetchIssueTimeline, fetchDashboardStats,
  fetchComplaints, fetchSites, fetchSupervisors, fetchSupervisorById,
  sendChatMessage, checkHealth, fetchPendingIssuesCard, fetchResolvedIssuesCard,
  fetchEscalatedIssuesCard, fetchResolvedPendingIssuesCard, fetchDashboardCardIssueDetail
};