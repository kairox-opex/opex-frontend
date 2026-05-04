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

// API Base URL - Backend is on port 8001
// const getBaseUrl = () => {
//   // For production/preview deployments, use the EXPO_PUBLIC_BACKEND_URL
//   const backendUrl = Constants.expoConfig?.extra?.backendUrl || 
//                      process.env.EXPO_PUBLIC_BACKEND_URL;

//   if (backendUrl) {
//     return `${backendUrl}/api`;
//   }

//   // For local development
//   if (Platform.OS === 'web') {
//     // Use relative URL which will be proxied
//     return 'http://localhost:8001/api';
//   }

//   // Native apps need full URL
//   return 'http://localhost:8001/api';//https://api.kairoxaitech.com
// };

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

// NOTE: Login is mock-only for this build (user directive: "frontend only,
// use mock data"). The real backend call is preserved below, commented out,
// so the switch back is one-line when the AWS backend is production-ready.
// Every mock-backed call emits a [BACKEND-GAP] warn on first invocation.
// Kairox v3.0: Switched back to real backend for login so we get a valid JWT token.
// The chat API requires a real JWT token.
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
  
  /* 
  // REAL API CALL (REST) - Commented out for now to use enriched mock data
  try {
    const queryParams = {};
    if (filters.status) queryParams.status_filter = filters.status;
    if (filters.priority) queryParams.priority = filters.priority;
    if (filters.site_id) queryParams.site_id = filters.site_id;
    if (filters.search) queryParams.search = filters.search;
    queryParams.limit = filters.limit || 10;
    if (filters.cursor) queryParams.cursor = filters.cursor;

    const response = await withRetry(
      () => api.get('/api/v1/issues', { params: queryParams }),
      { maxRetries: 2 }
    );
    const data = response.data;
    const rawItems = data.items || data.issues || [];
    const issues = rawItems.map((issue) => ({
      ...issue,
      site: issue.site || { name: issue.site_name || 'Unknown Site' },
      raised_by: issue.raised_by || { name: issue.supervisor_name || 'Supervisor' },
    }));
    return { success: true, issues, next_cursor: data.next_cursor || null, has_more: data.has_more ?? false };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || 'Failed to fetch issues' };
  }
  */

  // ENRICHED MOCK LOGIC
  console.warn('[BACKEND-GAP] issues/list: using enriched mock issues');
  await new Promise((r) => setTimeout(r, 180));

  let filtered = [...mockIssues];
  
  // Role-based filtering for Problem Solvers
  const storedUserRaw = await AsyncStorage.getItem('auth_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const role = user?.role;

  if (role === 'problem_solver' || role === 'problemsolver') {
    // In mock mode, deterministicly filter issues that would be assigned to this user
    filtered = filtered.filter((i) => {
      const isAssigned = i.status !== 'OPEN';
      const solverId = (i.id % 5) + 6;
      return isAssigned && solverId === user?.id;
    });
  }

  if (filters.status) {
    filtered = filtered.filter((i) => i.status === filters.status);
  }
  if (filters.priority) {
    filtered = filtered.filter((i) => i.priority === filters.priority);
  }
  if (filters.site_id) {
    filtered = filtered.filter((i) => i.site_id === filters.site_id);
  }
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    filtered = filtered.filter(
      (i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
    );
  }

  const issuesOut = filtered.map((issue) => {
    const site = mockSites.find((s) => s.id === issue.site_id);
    
    // Deterministic assignment for mock data
    const solverId = (issue.id % 5) + 6; // IDs 6-10 are solvers
    const supervisorId = (issue.id % 3) + 1; // IDs 1-3 are supervisors
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
      raised_by: { 
        name: supervisor?.name || 'System',
        avatar: supervisor?.avatar || null,
        role: 'Supervisor'
      },
    };
  });

  return {
    success: true,
    issues: issuesOut,
    next_cursor: null,
    has_more: false,
  };
};

/**
 * Fetch single issue by ID
 */
export const fetchIssueById = async (issueId) => {
  console.log(`\n🔎 ─── FETCH ISSUE DETAIL [${issueId}] ───`);

  /*
  // REAL API CALL (REST) - Commented out for now to use enriched mock data
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
  */

  // ENRICHED MOCK LOGIC
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
    raised_by: { 
      name: supervisor?.name || 'System',
      avatar: supervisor?.avatar || null,
      role: 'Supervisor'
    },
    images: raw.images || [],
    call_logs: raw.call_logs || [],
    complaints_count: raw.complaints_count || 0,
  };
  return { success: true, issue };
};

/**
 * Fetch issue timeline — complete audit trail of status changes and actors
 * GET /api/v1/issues/{issue_id}/timeline
 */
export const fetchIssueTimeline = async (issueId) => {
  console.log(`\n🕐 ─── FETCH ISSUE TIMELINE [${issueId}] ───`);
  try {
    console.log(`🌐 [Network] GET /api/v1/issues/${issueId}/timeline`);

    const response = await api.get(`/api/v1/issues/${issueId}/timeline`);

    const timeline = response.data?.timeline || response.data?.items || response.data || [];

    console.log('✅ [Success] Timeline received from backend');
    console.log(`📊 Events count: ${Array.isArray(timeline) ? timeline.length : 0}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      timeline: Array.isArray(timeline) ? timeline : [],
    };
  } catch (error) {
    console.error(`\n❌ ─── FETCH ISSUE ${issueId} TIMELINE FAILED ───`);
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      timeline: [],
    };
  }
};
// ==================== DASHBOARD API ====================
/**
 * Fetch dashboard statistics
 */
export const fetchDashboardStats = async () => {
  // Kairox v3.0: mock-only
  // eslint-disable-next-line no-console
  console.warn('[BACKEND-GAP] dashboard/stats: using mock aggregates');
  // TODO(backend): restore GET /api/v1/dashboard when AWS endpoint is live.
  await new Promise((r) => setTimeout(r, 180));

  const storedUserRaw = await AsyncStorage.getItem(USER_KEY);
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const role = user?.role;

  const countByStatus = (list, arr) =>
    list.filter((i) => arr.includes(i.status)).length;

  // Solver view
  if (role === 'problem_solver') {
    // Filter issues assigned to this user (mock: all open issues "belong" to them for demo)
    const assigned = mockIssues.slice(0, 6);
    const active = countByStatus(assigned, [
      'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED',
    ]);
    const done = countByStatus(assigned, ['COMPLETED']);
    return {
      success: true,
      data: {
        isSolverView: true,
        stats: {
          totalIssues: assigned.length,
          notFixedIssues: active,
          fixedIssues: done,
          complaints: mockComplaints.filter((c) => c.target_solver_id === user?.id).length,
        },
        recentIssues: assigned.slice(0, 5).map((a) => ({
          id: a.id,
          title: a.title,
          site_name: mockSites.find((s) => s.id === a.site_id)?.name || '—',
          priority: a.priority,
          status: a.status,
          created_at: a.deadline_at || a.created_at,
        })),
      },
    };
  }

  // Customer MD — scope to their sites
  if (role === 'customer_md') {
    const siteIds = user?.sites || [];
    const issues = mockIssues.filter((i) => siteIds.includes(i.site_id));
    const complaints = mockComplaints.filter((c) => {
      const issue = mockIssues.find((i) => i.id === c.issue_id);
      return issue && siteIds.includes(issue.site_id);
    });
    return {
      success: true,
      data: {
        isSolverView: false,
        stats: {
          totalIssues: issues.length,
          notFixedIssues: countByStatus(issues, [
            'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED',
          ]),
          fixedIssues: countByStatus(issues, ['COMPLETED']),
          complaints: complaints.length,
        },
        rawSummary: {},
        alerts: {
          escalations: countByStatus(issues, ['ESCALATED']),
          deadlines: 0,
          pendingReviews: 0,
        },
        recentIssues: issues.slice(0, 5),
        mySites: mockSites.filter((s) => siteIds.includes(s.id)),
      },
    };
  }

  // Supervisor / Manager — full view
  const totalIssues = mockIssues.length;
  return {
    success: true,
    data: {
      isSolverView: false,
      stats: {
        totalIssues,
        notFixedIssues: countByStatus(mockIssues, [
          'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED',
        ]),
        fixedIssues: countByStatus(mockIssues, ['COMPLETED']),
        complaints: mockComplaints.length,
      },
      rawSummary: {
        total_issues: totalIssues,
        completed_issues: countByStatus(mockIssues, ['COMPLETED']),
      },
      alerts: {
        escalations: countByStatus(mockIssues, ['ESCALATED']),
        deadlines: mockIssues.filter(
          (i) => new Date(i.deadline_at) < new Date() &&
            !['COMPLETED'].includes(i.status)
        ).length,
        pendingReviews: 3,
      },
      recentIssues: mockIssues.slice(0, 5),
      mySites: mockSites,
    },
  };
};

// ==================== COMPLAINTS API ====================

/**
 * Fetch all complaints
 */

export const fetchComplaints = async ({ cursor = null, limit = 20, status = null, search = null } = {}) => {
  console.log('\n🚨 ─── FETCH COMPLAINTS ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (status) params.status = status;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/complaints');

    const response = await api.get('/api/v1/complaints', { params });

    console.log('✅ [Success] Data received from backend');
    
    const data = response.data || {};
    const items = data.items || data.complaints || [];
    
    return {
      success: true,
      complaints: {
        items: items,
        next_cursor: data.next_cursor || null,
        has_more: data.has_more ?? false,
      },
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH COMPLAINTS FAILED ───', error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch complaints',
      complaints: { items: [], next_cursor: null, has_more: false },
    };
  }
};

export const fetchComplaintById = async (id) => {
  console.log(`\n🚨 ─── FETCH COMPLAINT DETAIL [${id}] ───`);
  try {
    const response = await api.get(`/api/v1/complaints/${id}`);
    console.log('✅ [Success] Complaint details received');
    return response.data;
  } catch (error) {
    console.error(`\n❌ ─── FETCH COMPLAINT ${id} FAILED ───`, error.message);
    throw new Error(error.response?.data?.detail || 'Failed to fetch complaint details');
  }
};
// ==================== SITES API ====================

/**
 * Fetch all sites
 */
export const fetchSites = async () => {
  console.log('\n🏗️ ─── FETCH SITES ───');
  try {
    console.log('🌐 [Network] GET /api/v1/sites/analytics');
    const response = await api.get('/api/v1/sites/analytics');
    console.log('✅ [Success] Sites received from backend');
    const sites = Array.isArray(response.data) ? response.data : (response.data?.sites || response.data?.items || []);
    console.log(`📊 Sites count: ${sites.length}`);
    return { success: true, sites };
  } catch (error) {
    console.error('\n❌ ─── FETCH SITES FAILED ───', error.message);
    return { success: false, sites: [], error: error.response?.data?.detail || 'Failed to fetch sites' };
  }
};

export const fetchSitesAnalytics = async () => {
  console.log('\n📊 ─── FETCH SITES ANALYTICS ───');
  try {
    console.log('🌐 [Network] GET /api/v1/sites/analytics');
    const response = await api.get('/api/v1/sites/analytics');
    console.log('✅ [Success] Sites analytics received from backend');
    const sites = Array.isArray(response.data) ? response.data : (response.data?.sites || response.data?.items || []);
    console.log(`📊 Sites count: ${sites.length}`);
    return { success: true, sites };
  } catch (error) {
    console.error('\n❌ ─── FETCH SITES ANALYTICS FAILED ───', error.message);
    return { success: false, sites: [], error: error.response?.data?.detail || 'Failed to fetch sites analytics' };
  }
};

export const fetchSiteAnalyticsById = async (siteId) => {
  console.log(`\n🔍 ─── FETCH SITE ANALYTICS [${siteId}] ───`);
  try {
    console.log(`🌐 [Network] GET /api/v1/sites/analytics/${siteId}`);
    const response = await api.get(`/api/v1/sites/analytics/${siteId}`);
    console.log('✅ [Success] Single site analytics received');
    return { success: true, site: response.data };
  } catch (error) {
    console.error(`\n❌ ─── FETCH SITE ${siteId} ANALYTICS FAILED ───`, error.message);
    return { success: false, site: null, error: error.response?.data?.detail || 'Failed to fetch site analytics' };
  }
};

export const fetchSolversPerformanceAPI = async () => {
  // eslint-disable-next-line no-console
  console.warn('[BACKEND-GAP] solvers/performance: using mock solver list');
  await new Promise((r) => setTimeout(r, 140));

  const solvers = mockUsers
    .filter((u) => u.role === 'problem_solver')
    .map((u) => {
      const assigned = mockIssues.filter(
        (i) => i.id % mockUsers.length === u.id % mockUsers.length
      ); // deterministic pseudo-assignment for demo
      const completed = assigned.filter((i) => i.status === 'COMPLETED').length;
      const pending = assigned.length - completed;
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        avatar_url: u.avatar,
        skill: u.skill,
        total_assigned: assigned.length,
        completed,
        pending,
        rating: (4 + ((u.id * 13) % 10) / 10).toFixed(1), // 4.0-4.9
      };
    });
  return { success: true, solvers };
};

// ==================== CHATBOT API ====================

/**
 * Send message to chatbot
 */
// chatService.js 

// ==================== CHATBOT API ====================

/**
 * Send message to chatbot
 */
export const sendChatMessage = async (
  text,
  sessionId = null,
  currentIssueId = null,
  imageUrl = null,
  intent = null
) => {
  console.log('\n💬 ─── 1. SENDING CHAT MESSAGE ───');

  try {
    const requestBody = {
      message: text,
      session_id: sessionId,
      issue_id: currentIssueId,
      image_url: imageUrl,
      metadata: {
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      },
      intent: intent
    };

    console.log('🚨 PROOF: THIS IS THE EXACT PAYLOAD WE ARE SENDING TO /api/v1/chat/ 🚨');
    console.log(JSON.stringify(requestBody, null, 2));

    const response = await api.post('/api/v1/chat/', requestBody);

    console.log('\n✅ Chat Response Success!');
    console.log('🚨 PROOF: THIS IS EXACTLY WHAT THE BACKEND RETURNED 🚨');
    console.log(JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("\n❌ Chat send error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || "Failed to send message",
    };
  }
};


export const sendChatWithImage = async ({
  text,
  sessionId,
  imageUri,
  intent,
  currentIssueId = null
}) => {
  console.log('\n🚀 ─── START: SEND CHAT WITH IMAGE FLOW ───');

  try {
    // 🟢 STEP 1: Send chat
    console.log('\n▶️ STEP 1: Sending text AND local imageUri to chat endpoint first...');
    const chatRes = await sendChatMessage(
      text,
      sessionId,
      currentIssueId,
      imageUri,
      intent
    );

    if (!chatRes.success) {
      console.error('❌ Chat request failed. Aborting image upload.');
      return chatRes;
    }

    // 📍 CRITICAL CHECK: Extract the issue ID
    const rawData = chatRes.data || {};
    const issueId = rawData.issue_id || rawData.data?.issue_id || currentIssueId;

    console.log('\n▶️ STEP 1.5: Extracted Issue ID for Image Upload:', issueId);

    // 🟡 STEP 2: Handle image
    if (imageUri && issueId) {
      // 🔥 Decide image type
      let imageType = "BEFORE";
      if (intent === "complete_work") {
        imageType = "AFTER";
      }

      console.log(`\n▶️ STEP 2: Preparing to upload to ImageKit as [${imageType}] for Issue #${issueId}`);

      // 🟣 Upload to ImageKit
      let imageUrl;
      try {
        imageUrl = await uploadImageToImageKit(imageUri, issueId, imageType);
        console.log(`✅ SUCCESS: ImageKit returned CDN URL: ${imageUrl}`);
      } catch (ikError) {
        console.error('❌ FAILED: ImageKit Upload Crashed:', ikError);
        throw ikError;
      }

      // 🔵 Save to DB
      console.log('\n▶️ STEP 3: Telling Backend to save CDN URL to database...');
      const dbPayload = {
        image_url: imageUrl,
        issue_id: issueId,
        image_type: imageType
      };

      try {
        const dbRes = await api.post('/api/v1/images/save', dbPayload);
        console.log(`✅ SUCCESS: Backend confirmed ${imageType} image saved! DB Response:`, dbRes.data);
      } catch (dbError) {
        console.error('❌ FAILED: Backend refused to save image to DB:', dbError.response?.data || dbError.message);
      }

    } else if (imageUri && !issueId) {
      console.warn('⚠️ WARNING: We sent the image, but the backend did not return an issue_id to upload it to!');
    } else {
      console.log('\nℹ️ No image attached. Skipping ImageKit steps.');
    }

    console.log('\n🏁 ─── END: SEND CHAT WITH IMAGE FLOW ───\n');
    return chatRes;

  } catch (error) {
    console.error("\n❌ FAILED: Fatal error in sendChatWithImage:", error);
    return { success: false };
  }
};



export const fetchChatSessions = async () => {
  try {
    const response = await api.get('/api/v1/chat/sessions');
    return {
      success: true,
      sessions: response.data.sessions,
    };
  } catch (error) {
    console.error("Fetch sessions error:", error.response?.data || error.message);
    return {
      success: false,
      sessions: [],
    };
  }
};

export const fetchSessionDetail = async (sessionId) => {
  try {
    const response = await api.get(`/api/v1/chat/sessions/${sessionId}`);
    return {
      success: true,
      session: response.data,
    };
  } catch (error) {
    console.error("Fetch session detail error:", error.response?.data || error.message);
    return {
      success: false,
      session: null,
    };
  }
};

// ==================== HEALTH CHECK ====================

/**
 * Check API health
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      ...response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'API not available',
    };
  }
};





/**
 * Fetch Pending Issues Card
 */
export const fetchPendingIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n⏳ ─── FETCH PENDING ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/pending-issues');

    const response = await api.get(
      '/api/v1/dashboard-cards/pending-issues',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH PENDING FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};

/**
 * Fetch Resolved Issues Card
 */
/**
 * Fetch Resolved Issues Card
 */
export const fetchResolvedIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n🔍 ─── FETCH RESOLVED ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/resolved');

    const response = await api.get(
      '/api/v1/dashboard-cards/resolved',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH RESOLVED FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    ;
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
}
/**
 * Fetch Escalated Issues Card
 */
/**
 * Fetch Escalated Issues Card
 */
export const fetchEscalatedIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n🔥 ─── FETCH ESCALATED ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/escalated');

    const response = await api.get(
      '/api/v1/dashboard-cards/escalated',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH ESCALATED FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};



/**
 * Fetch Resolved Pending Review Issues Card
 */
export const fetchResolvedPendingIssuesCard = async ({
  cursor = null,
  limit = 20,
  site_id = null,
  priority = null,
  search = null,
} = {}) => {
  console.log('\n👀 ─── FETCH RESOLVED PENDING REVIEW ISSUES ───');
  try {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    if (site_id) params.site_id = site_id;
    if (priority) params.priority = priority;
    if (search) params.search = search;

    console.log('📤 [Request] Params:', params);
    console.log('🌐 [Network] GET /api/v1/dashboard-cards/resolved-pending-review');

    const response = await api.get(
      '/api/v1/dashboard-cards/resolved-pending-review',
      { params }
    );

    console.log('✅ [Success] Data received from backend:');
    console.log(`📊 Items count: ${response.data?.items?.length || 0}`);
    console.log(`👉 Next Cursor: ${response.data?.next_cursor}`);
    console.log(`🔄 Has More: ${response.data?.has_more}`);
    console.log('────────────────────────────────\n');

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH RESOLVED PENDING REVIEW FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Backend Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network/Axios Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      data: { items: [], next_cursor: null, has_more: false },
    };
  }
};

/**
 * Fetch specific Dashboard Card Issue Detail
 * Routes dynamically to the role-aware dashboard endpoints.
 * @param {string} cardType - 'pending-issues', 'resolved', 'escalated', or 'resolved-pending-review'
 * @param {number} issueId 
 */
export const fetchDashboardCardIssueDetail = async (cardType, issueId) => {
  console.log(`\n📄 ─── FETCH DASHBOARD CARD DETAIL (${cardType.toUpperCase()}) ───`);
  try {
    console.log(`🌐 [Network] GET /api/v1/dashboard-cards/${cardType}/${issueId}`);

    const response = await api.get(`/api/v1/dashboard-cards/${cardType}/${issueId}`);

    console.log('✅ [Success] Detail data received successfully');

    // Map backend fields to frontend format identically to fetchIssueById
    const issue = {
      ...response.data,
      site: response.data.site ? {
        ...response.data.site,
        name: response.data.site.name,
      } : null,
      raised_by: response.data.raised_by ? {
        ...response.data.raised_by,
        avatar: response.data.raised_by.avatar_url,
      } : null,
    };

    return {
      success: true,
      issue,
    };
  } catch (error) {
    console.error('\n❌ ─── FETCH CARD DETAIL FAILED ───');
    if (error.response) {
      console.error('🚨 Status:', error.response.status);
      console.error('🚨 Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🚨 Network Error:', error.message);
    }
    console.error('────────────────────────────────\n');

    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to fetch issue detail',
    };
  }
};


export default {
  // Auth
  loginUser,
  getCurrentUser,
  logoutUser,
  isAuthenticated,
  getStoredUser,

  // Issues
  fetchIssues,
  fetchIssueById,
  fetchIssueTimeline,

  // Dashboard
  fetchDashboardStats,

  // Complaints
  fetchComplaints,

  // Sites
  fetchSites,

  // Chatbot
  sendChatMessage,

  // Health
  checkHealth,


  //pending issues, resolved issues, escalatedIssues

  fetchPendingIssuesCard,
  fetchResolvedIssuesCard,
  fetchEscalatedIssuesCard,


  fetchResolvedPendingIssuesCard,
  fetchDashboardCardIssueDetail
};