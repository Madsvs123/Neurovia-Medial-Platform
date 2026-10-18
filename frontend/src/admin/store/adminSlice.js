import { createSlice } from '@reduxjs/toolkit';
import { getUserInfo } from '../../utils/auth';

const initialState = {
  adminInfo: getUserInfo(),
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    adminLoginRequest(state) { state.loading = true; state.error = null; },
    adminLoginSuccess(state, action) { state.loading = false; state.adminInfo = action.payload; state.error = null; },
    adminLoginFail(state, action) { state.loading = false; state.error = action.payload; },
    adminLogout(state) { state.adminInfo = null; state.error = null; },
  },
});

export const { adminLoginRequest, adminLoginSuccess, adminLoginFail, adminLogout } = adminSlice.actions;
export default adminSlice.reducer;
