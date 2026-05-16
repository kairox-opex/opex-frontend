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

export const fetchMDContactCard = async () => {
  try {
    const response = await api.get('/api/v1/me/md');
    return { success: true, md: response.data?.md || response.data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch MD contact' };
  }
};

// ==================== ISSUES API (BACKEND) ====================

export const fetchIssues = async (filters = {}) => {
  try {
    const queryParams = {};
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        queryParams[key] = filters[key];
      }
    });
    
    if (queryParams.status) {
      queryParams.status_filter = queryParams.status;
      delete queryParams.status;
    }
    if (queryParams.site) {
      queryParams.site_id = queryParams.site;
      delete queryParams.site;
    }

    const response = await api.get('/api/v1/issues', { params: queryParams });
    const data = response.data || {};
    const items = data.items || data.issues || [];
    
    const issues = items.map((issue) => ({
      ...issue,
      site: issue.site || { name: issue.site_name || 'Unknown Site' },
      raised_by: issue.raised_by || { name: issue.supervisor_name || 'Supervisor' },
    }));
    return { success: true, issues, next_cursor: data.next_cursor, has_more: data.has_more };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchIssues:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params
    });
    return { success: false, issues: [], error: error.response?.data?.detail || 'Server error' };
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
    const response = await api.get('/api/v1/dashboard');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchSolversPerformanceAPI = async () => {
  try {
    const response = await api.get('/api/v1/solvers');
    // Backend returns { total, solvers: [...] } — extract the array
    const raw = response.data;
    const rawSolvers = Array.isArray(raw) ? raw : Array.isArray(raw?.solvers) ? raw.solvers : [];

    // Normalize: backend list endpoint returns SolverListItem (score/label at top level)
    // but frontend expects SolverWithPerformance shape (performance sub-object).
    const solvers = rawSolvers.map(solver => {
      if (solver.performance) return solver; // Already has performance sub-object
      return {
        ...solver,
        performance: {
          score: solver.score ?? 0,
          label: solver.label || 'No Rating',
          label_color: solver.label_color || '#f59e0b',
          // Fill other defaults for metrics shown in the list
          active_count: solver.active_count || 0,
          completed_count: solver.completed_count || 0,
          complaint_count: solver.complaint_count || 0,
          completion_rate: solver.completion_rate || 0,
          on_time_rate: solver.on_time_rate || 0,
        },
      };
    });

    return { success: true, solvers };
  } catch (error) {
    return { success: false, solvers: [] };
  }
};

// ==================== DASHBOARD CARD ENDPOINTS
export const fetchResolvedIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/resolved', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchPendingIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/pending-issues', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchEscalatedIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/escalated', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchResolvedPendingIssuesCard = async (params) => {
  try {
    const response = await api.get('/api/v1/dashboard-cards/resolved-pending-review', { params });
    const data = response.data;
    const items = (data.items || []).map(issue => ({
      ...issue,
      solver_name: issue.solver_name || issue.assignments?.[0]?.solver_name || issue.solver?.name || null,
      supervisor_name: issue.supervisor_name || issue.raised_by?.name || 'N/A'
    }));
    return { success: true, data: { ...data, items } };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

export const fetchDashboardCardIssueDetail = async (cardType, issueId) => {
  try {
    const response = await api.get(`/api/v1/dashboard-cards/${cardType}/${issueId}`);
    return { success: true, issue: response.data };
  } catch (error) {
    return { success: false, error: 'Failed' };
  }
};

// ==================== BUDGET API ====================

export const fetchBudgetRequests = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/budget/requests', { params });
    const data = response.data;
    // Handle both { items: [] } and direct array [ ]
    const rawItems = Array.isArray(data) ? data : (data.items || []);
    const items = rawItems.map(item => ({
      ...item,
      site_name: item.site_name || item.site?.name || item.location_name || item.location,
      supervisor_name: item.supervisor_name || item.raised_by?.name || 'Supervisor'
    }));
    return { success: true, data: Array.isArray(data) ? items : { ...data, items } };
  } catch (error) {
    console.log('DEBUG API ERROR fetchBudgetRequests:', error.response?.status, error.response?.data);
    return { success: false, error: 'Failed to fetch budget requests' };
  }
};

export const fetchBudgetTotals = async (user) => {
  try {
    const response = await api.get('/api/v1/budget/totals', { params: { user_id: user?.id } });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch budget totals' };
  }
};

export const classifyBudgetAmount = async (amountPaise) => {
  try {
    const response = await api.get('/api/v1/budget/classify', { params: { amount_paise: amountPaise } });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Classification failed' };
  }
};

export const createBudgetRequest = async (payload) => {
  try {
    const response = await api.post('/api/v1/budget/requests', payload);
    const budget = response.data;
    // Normalize the new record so it displays correctly immediately
    const normalized = {
      ...budget,
      site_name: budget.site_name || budget.site?.name || budget.location_name || payload.site_name,
      supervisor_name: budget.supervisor_name || budget.raised_by?.name || 'Supervisor'
    };
    return { success: true, data: normalized };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail?.[0]?.msg || 'Failed to create budget request' };
  }
};

export const fetchBudgetBurnRates = async () => {
  try {
    const response = await api.get('/api/v1/budget/burn-rate');
    const data = response.data;
    // Normalize site names in burn rates
    const normalized = (Array.isArray(data) ? data : (data.burn_rates || [])).map(br => ({
      ...br,
      site_name: br.site_name || br.site?.name || 'Unknown Site'
    }));
    return { success: true, data: normalized };
  } catch (error) {
    return { success: false, error: 'Failed to fetch burn rates' };
  }
};

export const fetchThresholdAlerts = async () => {
  try {
    const response = await api.get('/api/v1/budget/threshold-alerts');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch threshold alerts' };
  }
};

export const fetchBudgetRequestById = async (id) => {
  try {
    const response = await api.get(`/api/v1/budget/requests/${id}`);
    const item = response.data;
    const normalized = {
      ...item,
      site_name: item.site_name || item.site?.name || item.location_name || item.location,
      supervisor_name: item.supervisor_name || item.raised_by?.name || 'Supervisor'
    };
    return { success: true, data: normalized };
  } catch (error) {
    return { success: false, error: 'Failed to fetch request details' };
  }
};

// POST /budget/requests/{request_id}/accept — MD approves a PENDING request
export const acceptBudgetRequest = async (requestId, note = '') => {
  try {
    const response = await api.post(`/api/v1/budget/requests/${requestId}/accept`, { note });
    return { success: true, data: response.data };
  } catch (error) {
    let errorMessage = 'Failed to approve request';
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
    else if (typeof detail === 'string') errorMessage = detail;
    return { success: false, error: errorMessage };
  }
};

// POST /budget/requests/{request_id}/reject — MD rejects a PENDING request
export const rejectBudgetRequest = async (requestId, note = '') => {
  try {
    const response = await api.post(`/api/v1/budget/requests/${requestId}/reject`, { note });
    return { success: true, data: response.data };
  } catch (error) {
    let errorMessage = 'Failed to reject request';
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
    else if (typeof detail === 'string') errorMessage = detail;
    return { success: false, error: errorMessage };
  }
};

// POST /budget/requests/{request_id}/escalate — MD escalates to Customer MD
export const escalateBudgetRequest = async (requestId, note = '') => {
  try {
    const response = await api.post(`/api/v1/budget/requests/${requestId}/escalate`, { note });
    return { success: true, data: response.data };
  } catch (error) {
    let errorMessage = 'Failed to escalate request';
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
    else if (typeof detail === 'string') errorMessage = detail;
    return { success: false, error: errorMessage };
  }
};

// POST /budget/requests/{request_id}/esc-approve — Customer MD approves
export const escApproveBudgetRequest = async (requestId, note = '') => {
  try {
    const response = await api.post(`/api/v1/budget/requests/${requestId}/esc-approve`, { note });
    return { success: true, data: response.data };
  } catch (error) {
    let errorMessage = 'Failed to approve escalated request';
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
    else if (typeof detail === 'string') errorMessage = detail;
    return { success: false, error: errorMessage };
  }
};

// POST /budget/requests/{request_id}/esc-reject — Customer MD rejects
export const escRejectBudgetRequest = async (requestId, note = '') => {
  try {
    const response = await api.post(`/api/v1/budget/requests/${requestId}/esc-reject`, { note });
    return { success: true, data: response.data };
  } catch (error) {
    let errorMessage = 'Failed to reject escalated request';
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) errorMessage = detail[0].msg;
    else if (typeof detail === 'string') errorMessage = detail;
    return { success: false, error: errorMessage };
  }
};

// GET /budget/sites/{site_id} — MTD budget summary for a single site
export const fetchSiteBudgetSummary = async (siteId) => {
  try {
    const response = await api.get(`/api/v1/budget/sites/${siteId}`);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 403) {
      return { success: false, error: 'Access denied for this site', code: 403 };
    }
    return { success: false, error: 'Failed to fetch site budget summary' };
  }
};

// GET /budget/sites/{site_id}/history — Month-by-month approved spend
export const fetchSiteBudgetHistory = async (siteId, months = 6) => {
  try {
    const response = await api.get(`/api/v1/budget/sites/${siteId}/history`, {
      params: { months }
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 403) {
      return { success: false, error: 'Access denied for this site', code: 403 };
    }
    return { success: false, error: 'Failed to fetch budget history' };
  }
};

// ==================== SUPERVISORS API ====================

export const fetchSupervisors = async () => {
  try {
    const response = await api.get('/api/v1/supervisors');
    // Backend might return { total, items: [...] } or just [...]
    const supervisors = response.data?.items || response.data || [];
    return { success: true, supervisors };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchSupervisors:', error.response?.status, error.response?.data);
    return { success: false, supervisors: [], error: error.response?.data?.detail || 'Failed to fetch supervisors' };
  }
};

export const fetchSupervisorById = async (id) => {
  try {
    const response = await api.get(`/api/v1/supervisors/${id}`);
    return { success: true, supervisor: response.data };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchSupervisorById:', id, error.response?.status, error.response?.data);
    return { success: false, supervisor: null, error: error.response?.data?.detail || 'Failed to fetch supervisor detail' };
  }
};

// ==================== CUSTOMER MD API ====================

export const fetchCustomerMDs = async () => {
  try {
    const response = await api.get('/api/v1/customer-mds');
    // Backend might return { total, items: [...] } or just [...]
    const customerMDs = response.data?.items || response.data || [];
    return { success: true, customerMDs };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchCustomerMDs:', error.response?.status, error.response?.data);
    return { success: false, customerMDs: [], error: error.response?.data?.detail || 'Failed to fetch Customer MDs' };
  }
};

export const fetchCustomerMDById = async (id) => {
  try {
    const response = await api.get(`/api/v1/customer-mds/${id}`);
    return { success: true, customerMD: response.data };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchCustomerMDById:', id, error.response?.status, error.response?.data);
    return { success: false, customerMD: null, error: error.response?.data?.detail || 'Failed to fetch Customer MD detail' };
  }
};

// ==================== SITES & OTHERS ====================

export const fetchSitesAnalytics = async () => {
  try {
    const response = await api.get('/api/v1/sites/analytics');
    // Backend returns { total, sites: [...] } — extract the array
    const raw = response.data;
    const rawSites = Array.isArray(raw) ? raw : Array.isArray(raw?.sites) ? raw.sites : [];

    // Normalize: backend list endpoint returns SiteListItem (score/health at top level)
    // but frontend expects SiteWithAnalytics shape (analytics sub-object).
    // Handle both shapes so the frontend always gets a consistent structure.
    const sites = rawSites.map(site => {
      if (site.analytics) return site; // Already has analytics sub-object
      return {
        ...site,
        analytics: {
          health: site.health || 'Healthy',
          score: site.score ?? 100,
          total_issues: site.total_issues || 0,
          open_issues: site.open_issues || 0,
          assigned_issues: site.assigned_issues || 0,
          in_progress_issues: site.in_progress_issues || 0,
          completed_issues: site.completed_issues || 0,
          escalated_issues: site.escalated_issues || 0,
          reopened_issues: site.reopened_issues || 0,
          overdue_count: site.overdue_count || 0,
          complaints_count: site.complaints_count || 0,
          solvers: site.solvers || [],
        },
      };
    });

    return { success: true, sites };
  } catch (error) {
    return { success: false, sites: [] };
  }
};

// For backward compatibility
export const fetchSites = fetchSitesAnalytics;

export const fetchComplaints = async ({ cursor = null, limit = 20, issue_id = null, solver_id = null } = {}) => {
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (issue_id) params.issue_id = issue_id;
    if (solver_id) params.solver_id = solver_id;

    const response = await api.get('/api/v1/complaints', { params });
    // CursorPage returns { items, next_cursor, has_more, total_returned }
    return { success: true, complaints: response.data };
  } catch (error) {
    console.warn("fetchComplaints warn:", error.message);
    return { success: false, complaints: { items: [], has_more: false } };
  }
};

export const fetchComplaintById = async (id) => {
  try {
    if (!id) throw new Error("Complaint ID is required");
    const response = await api.get(`/api/v1/complaints/${id}`);

    // Ensure the response data is a valid object
    if (!response.data || typeof response.data !== 'object') {
      throw new Error("Invalid response from server");
    }

    return {
      success: true,
      complaint: response.data
    };
  } catch (error) {
    console.error(`fetchComplaintById(${id}) error:`, error.message);
    return { success: false, error: error.message || 'Failed to fetch complaint' };
  }
};

// ==================== PERSONAL CHATS API ====================

export const fetchPersonalThreads = async () => {
  console.log('API CALL: GET /api/v1/personal-chats/threads');
  try {
    const response = await api.get('/api/v1/personal-chats/threads');
    console.log('API RESPONSE [threads]:', response.data);
    return { success: true, threads: response.data };
  } catch (error) {
    console.error('API ERROR [threads]:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.detail || 'Failed to fetch threads' };
  }
};

export const openPersonalThread = async (otherUserId) => {
  console.log(`API CALL: POST /api/v1/personal-chats/threads (other_user_id: ${otherUserId})`);
  try {
    const response = await api.post('/api/v1/personal-chats/threads', { other_user_id: otherUserId });
    console.log('API RESPONSE [openThread]:', response.data);
    return { success: true, thread: response.data };
  } catch (error) {
    console.error('API ERROR [openThread]:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.detail || 'Failed to open thread' };
  }
};

export const fetchPersonalMessages = async (threadId, before = null, limit = 50) => {
  console.log(`API CALL: GET /api/v1/personal-chats/threads/${threadId}/messages (limit: ${limit}, before: ${before})`);
  try {
    const params = { limit };
    if (before) params.before = before;
    const response = await api.get(`/api/v1/personal-chats/threads/${threadId}/messages`, { params });
    console.log(`API RESPONSE [messages for ${threadId}]:`, response.data?.items?.length || 0, 'items');
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`API ERROR [messages for ${threadId}]:`, error.response?.data || error.message);
    return { success: false, error: 'Failed to fetch messages' };
  }
};

export const sendPersonalChatMessage = async (threadId, body, imageUrls = []) => {
  console.log(`API CALL: POST /api/v1/personal-chats/threads/${threadId}/messages (body: ${body})`);
  try {
    const response = await api.post(`/api/v1/personal-chats/threads/${threadId}/messages`, { body, image_urls: imageUrls });
    console.log('API RESPONSE [sendMessage]:', response.data);
    return { success: true, messages: response.data }; // Returns list[ChatMessageResponse]
  } catch (error) {
    console.error('API ERROR [sendMessage]:', error.response?.data || error.message);
    return { success: false, error: 'Failed to send message' };
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

export const sendChatWithImage = async ({ text, sessionId, imageUri, intent }) => {
  try {
    // If imageUri is provided, we might need to upload it first if it's a local path
    // For now, assuming it's already a URL or the backend handles it.
    // If it's a local path (starts with file://), you should call uploadImageToImageKit first.
    let finalImageUrl = imageUri;

    if (imageUri && (imageUri.startsWith('file://') || imageUri.startsWith('content://'))) {
      const uploadRes = await uploadImageToImageKit(imageUri);
      if (uploadRes.success) {
        finalImageUrl = uploadRes.url;
      }
    }

    return await sendChatMessage(text, sessionId, null, finalImageUrl, intent);
  } catch (error) {
    console.error("sendChatWithImage error:", error);
    return { success: false };
  }
};

// ==================== GROUP CHATS API ====================

export const fetchGroupChats = async () => {
  try {
    const response = await api.get('/api/v1/group-chats');
    const data = response.data?.items || response.data || [];
    return { success: true, data };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchGroupChats:', error.response?.status, error.response?.data);
    return { success: false, data: [], error: error.response?.data?.detail || 'Failed to fetch group chats' };
  }
};

export const fetchGroupChatById = async (groupId) => {
  try {
    const response = await api.get(`/api/v1/group-chats/${groupId}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchGroupChatById:', groupId, error.response?.status, error.response?.data);
    return { success: false, data: null, error: error.response?.data?.detail || 'Failed to fetch group chat detail' };
  }
};

export const fetchGroupMessages = async (groupId, cursor = null, limit = 50) => {
  try {
    const params = { limit };
    if (cursor) params.before = cursor;
    
    const response = await api.get(`/api/v1/group-chats/${groupId}/messages`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    console.warn('DEBUG API ERROR fetchGroupMessages:', groupId, error.response?.status, error.response?.data);
    return { success: false, data: { items: [], has_more: false } };
  }
};

export const sendGroupMessageAPI = async (groupId, text) => {
  try {
    const response = await api.post(`/api/v1/group-chats/${groupId}/messages`, { body: text, image_urls: [] });
    return { success: true, data: response.data };
  } catch (error) {
    console.warn('DEBUG API ERROR sendGroupMessageAPI:', groupId, error.response?.status, error.response?.data);
    return { success: false, error: 'Failed to send message' };
  }
};

export const markGroupAsRead = async (groupId) => {
  try {
    await api.post(`/api/v1/group-chats/${groupId}/read`);
    return { success: true };
  } catch (error) {
    console.warn('DEBUG API ERROR markGroupAsRead:', groupId, error.response?.status, error.response?.data);
    return { success: false, error: 'Failed to mark as read' };
  }
};

export default {
  loginUser, getCurrentUser, logoutUser, isAuthenticated, getStoredUser, fetchMDContactCard,
  fetchIssues, fetchIssueById, fetchIssueTimeline, fetchDashboardStats, fetchSolversPerformanceAPI,
  fetchResolvedIssuesCard, fetchPendingIssuesCard, fetchEscalatedIssuesCard, fetchResolvedPendingIssuesCard, fetchDashboardCardIssueDetail,
  fetchSupervisors, fetchSupervisorById, fetchCustomerMDs, fetchCustomerMDById,
  fetchSites, fetchSitesAnalytics, fetchComplaints, fetchComplaintById, sendChatMessage, sendChatWithImage,
  fetchBudgetRequests, fetchBudgetTotals, classifyBudgetAmount, createBudgetRequest, fetchBudgetBurnRates,
  escApproveBudgetRequest, escRejectBudgetRequest,
  fetchGroupChats, fetchGroupChatById, fetchGroupMessages, sendGroupMessageAPI, markGroupAsRead
};