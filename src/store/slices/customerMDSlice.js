import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCustomerMDs as fetchCustomerMDsApi, fetchCustomerMDById as fetchCustomerMDByIdApi } from '../../services/api';

const initialState = {
  customerMDs: [],
  currentCustomerMD: null,
  loading: false,
  error: null,
};

export const fetchCustomerMDs = createAsyncThunk(
  'customerMDs/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchCustomerMDsApi();
      if (!result.success) return rejectWithValue(result.error);
      return result.customerMDs;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCustomerMDById = createAsyncThunk(
  'customerMDs/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const result = await fetchCustomerMDByIdApi(id);
      if (!result.success) return rejectWithValue(result.error);
      return result.customerMD;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const customerMDSlice = createSlice({
  name: 'customerMDs',
  initialState,
  reducers: {
    clearCurrentCustomerMD: (state) => {
      state.currentCustomerMD = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerMDs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerMDs.fulfilled, (state, action) => {
        state.loading = false;
        state.customerMDs = action.payload;
      })
      .addCase(fetchCustomerMDs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCustomerMDById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerMDById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomerMD = action.payload;
      })
      .addCase(fetchCustomerMDById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentCustomerMD } = customerMDSlice.actions;

export const selectAllCustomerMDs = (state) => state.customerMDs.customerMDs;
export const selectCurrentCustomerMD = (state) => state.customerMDs.currentCustomerMD;
export const selectCustomerMDsLoading = (state) => state.customerMDs.loading;
export const selectCustomerMDsError = (state) => state.customerMDs.error;

export default customerMDSlice.reducer;
