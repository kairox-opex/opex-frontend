import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchSupervisors as fetchSupervisorsApi, fetchSupervisorById as fetchSupervisorByIdApi } from '../../services/api';

const initialState = {
  supervisors: [],
  currentSupervisor: null,
  loading: false,
  error: null,
};

export const fetchSupervisors = createAsyncThunk(
  'supervisors/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchSupervisorsApi();
      if (!result.success) return rejectWithValue(result.error);
      return result.supervisors;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSupervisorById = createAsyncThunk(
  'supervisors/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const result = await fetchSupervisorByIdApi(id);
      if (!result.success) return rejectWithValue(result.error);
      return result.supervisor;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const supervisorsSlice = createSlice({
  name: 'supervisors',
  initialState,
  reducers: {
    clearCurrentSupervisor: (state) => {
      state.currentSupervisor = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupervisors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupervisors.fulfilled, (state, action) => {
        state.loading = false;
        state.supervisors = action.payload;
      })
      .addCase(fetchSupervisors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSupervisorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupervisorById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSupervisor = action.payload;
      })
      .addCase(fetchSupervisorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentSupervisor } = supervisorsSlice.actions;

export const selectAllSupervisors = (state) => state.supervisors.supervisors;
export const selectCurrentSupervisor = (state) => state.supervisors.currentSupervisor;
export const selectSupervisorsLoading = (state) => state.supervisors.loading;
export const selectSupervisorsError = (state) => state.supervisors.error;

export default supervisorsSlice.reducer;
