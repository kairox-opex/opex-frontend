import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchBudgetRequests as fetchBudgetRequestsApi,
  fetchBudgetTotals as fetchBudgetTotalsApi,
  fetchBudgetBurnRates as fetchBudgetBurnRatesApi,
  fetchThresholdAlerts as fetchThresholdAlertsApi,
  createBudgetRequest as createBudgetRequestApi,
  classifyBudgetAmount as classifyBudgetAmountApi,
  fetchBudgetRequestById as fetchBudgetRequestByIdApi,
  acceptBudgetRequest as acceptBudgetRequestApi,
  rejectBudgetRequest as rejectBudgetRequestApi,
  escalateBudgetRequest as escalateBudgetRequestApi,
  escApproveBudgetRequest as escApproveBudgetRequestApi,
  escRejectBudgetRequest as escRejectBudgetRequestApi
} from '../../services/api';

const initialState = {
  requests: [],
  totals: null,
  burnRates: [],
  thresholdAlerts: [],
  loading: false,
  loadingMore: false,
  nextCursor: null,
  hasMore: true,
  error: null,
  classification: null, // For live tier preview
  classificationLoading: false,
  currentRequest: null,
  currentRequestLoading: false,
};

export const fetchBudgetRequests = createAsyncThunk(
  'budget/fetchRequests',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().budget;
      const isReset = params?.reset !== false;

      if (!isReset && !state.hasMore) {
        return rejectWithValue('No more items');
      }

      // If backend strictly expects a UUID cursor, use the ID of the last fetched item 
      // instead of the base64 next_cursor if the next_cursor is not a valid UUID.
      let finalCursor = isReset ? null : state.nextCursor;
      if (finalCursor && !finalCursor.includes('-') && state.requests?.length > 0) {
        finalCursor = state.requests[state.requests.length - 1].id;
      }

      // Build the query parameters object
      const queryParams = {
        cursor: finalCursor,
        limit: params?.limit || 20,
        site_id: params?.site_id || null,
      };

      // Send both parameter styles to ensure backend catches it
      if (params?.status) {
        const s = params.status.toUpperCase();
        queryParams.status = s;
        queryParams.status_filter = s;
      }

      console.log('DEBUG Fetching Budgets:', queryParams);

      const result = await fetchBudgetRequestsApi(queryParams);

      const responseData = result.data || {};
      const nextCursorVal = responseData.next_cursor || responseData.cursor;
      const hasMoreVal = responseData.has_more ?? (nextCursorVal ? true : false);

      console.log('DEBUG Budget Result Pagination:', {
        has_more: hasMoreVal,
        next_cursor: nextCursorVal,
        items_count: responseData.items?.length || responseData.length
      });

      if (!result.success) return rejectWithValue(result.error);

      return {
        requests: Array.isArray(result.data) ? result.data : (result.data.items || []),
        next_cursor: nextCursorVal,
        has_more: hasMoreVal,
        isReset
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch budget requests');
    }
  }
);

export const fetchBudgetTotals = createAsyncThunk(
  'budget/fetchTotals',
  async (_, { getState, rejectWithValue }) => {
    try {
      const user = getState().auth.user;
      const result = await fetchBudgetTotalsApi(user);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch budget totals');
    }
  }
);

export const fetchBudgetBurnRates = createAsyncThunk(
  'budget/fetchBurnRates',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchBudgetBurnRatesApi();
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch burn rates');
    }
  }
);

export const fetchThresholdAlerts = createAsyncThunk(
  'budget/fetchThresholdAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchThresholdAlertsApi();
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch threshold alerts');
    }
  }
);

export const classifyAmount = createAsyncThunk(
  'budget/classify',
  async (amountPaise, { rejectWithValue }) => {
    try {
      const result = await classifyBudgetAmountApi(amountPaise);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createBudgetRequest = createAsyncThunk(
  'budget/createRequest',
  async (payload, { rejectWithValue }) => {
    try {
      const result = await createBudgetRequestApi(payload);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRequestById = createAsyncThunk(
  'budget/fetchRequestById',
  async (id, { rejectWithValue }) => {
    try {
      const result = await fetchBudgetRequestByIdApi(id);
      if (!result.success) return rejectWithValue(result.error);
      return result.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateRequestStatus = createAsyncThunk(
  'budget/updateStatus',
  async ({ id, type, note }, { rejectWithValue }) => {
    try {
      let result;
      if (type === 'ACCEPT') result = await acceptBudgetRequestApi(id, note);
      else if (type === 'REJECT') result = await rejectBudgetRequestApi(id, note);
      else if (type === 'ESCALATE') result = await escalateBudgetRequestApi(id, note);
      else if (type === 'ESC_ACCEPT') result = await escApproveBudgetRequestApi(id, note);
      else if (type === 'ESC_REJECT') result = await escRejectBudgetRequestApi(id, note);

      if (!result?.success) return rejectWithValue(result?.error || 'Unknown error');
      return { id, type, data: result.data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    clearClassification: (state) => {
      state.classification = null;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Requests
      .addCase(fetchBudgetRequests.pending, (state, action) => {
        const isReset = action.meta.arg?.reset !== false;
        if (isReset) {
          state.loading = true;
          state.requests = []; // Clear old data immediately on filter change
        } else {
          state.loadingMore = true;
        }
        state.error = null;
      })
      .addCase(fetchBudgetRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        if (action.payload.isReset) {
          state.requests = action.payload.requests;
        } else {
          state.requests = [...state.requests, ...action.payload.requests];
        }
        state.nextCursor = action.payload.next_cursor;
        state.hasMore = action.payload.has_more;
      })
      .addCase(fetchBudgetRequests.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.hasMore = false; // Stop the infinite scroll loop on error
        if (action.payload !== 'No more items') state.error = action.payload;
      })
      // Totals
      .addCase(fetchBudgetTotals.fulfilled, (state, action) => {
        state.totals = action.payload;
      })
      // Burn Rates
      .addCase(fetchBudgetBurnRates.fulfilled, (state, action) => {
        state.burnRates = action.payload;
      })
      // Classify
      .addCase(classifyAmount.pending, (state) => {
        state.classificationLoading = true;
      })
      .addCase(classifyAmount.fulfilled, (state, action) => {
        state.classificationLoading = false;
        state.classification = action.payload;
      })
      .addCase(classifyAmount.rejected, (state) => {
        state.classificationLoading = false;
      })
      // Create Request
      .addCase(createBudgetRequest.fulfilled, (state, action) => {
        // Handle both possible response shapes (direct object or {budget: ...})
        const newBudget = action.payload?.budget || (action.payload?.id ? action.payload : null);

        if (newBudget) {
          // Normalize if needed (though new.js usually sends site_name)
          const normalized = {
            ...newBudget,
            site_name: newBudget.site_name || newBudget.site?.name
          };
          state.requests = [normalized, ...state.requests];
        }
      })
      // Threshold Alerts
      .addCase(fetchThresholdAlerts.fulfilled, (state, action) => {
        state.thresholdAlerts = action.payload;
      })
      // Fetch By ID
      .addCase(fetchRequestById.pending, (state) => {
        state.currentRequestLoading = true;
        state.currentRequest = null;
      })
      .addCase(fetchRequestById.fulfilled, (state, action) => {
        state.currentRequestLoading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchRequestById.rejected, (state, action) => {
        state.currentRequestLoading = false;
        state.error = action.payload;
      })
      // Update Status
      .addCase(updateRequestStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateRequestStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRequest = action.payload.data;
        // Update in the list as well if it exists
        const index = state.requests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload.data;
        }
      })
      .addCase(updateRequestStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearClassification, clearCurrentRequest } = budgetSlice.actions;

// Selectors
export const selectBudgetRequests = (state) => state.budget.requests;
export const selectBudgetTotals = (state) => state.budget.totals;
export const selectBudgetBurnRates = (state) => state.budget.burnRates;
export const selectThresholdAlerts = (state) => state.budget.thresholdAlerts;
export const selectBudgetLoading = (state) => state.budget.loading;
export const selectBudgetLoadingMore = (state) => state.budget.loadingMore;
export const selectHasMoreBudgets = (state) => state.budget.hasMore;
export const selectBudgetClassification = (state) => state.budget.classification;
export const selectBudgetClassificationLoading = (state) => state.budget.classificationLoading;
export const selectCurrentBudgetRequest = (state) => state.budget.currentRequest;
export const selectCurrentBudgetRequestLoading = (state) => state.budget.currentRequestLoading;

export default budgetSlice.reducer;
