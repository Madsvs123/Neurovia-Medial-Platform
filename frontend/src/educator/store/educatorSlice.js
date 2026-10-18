import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  educatorInfo: null,
  loading: false,
  error: null,
};

const educatorSlice = createSlice({
  name: 'educator',
  initialState,
  reducers: {
    loginRequest(state) { state.loading = true; state.error = null; },
    loginSuccess(state, action) { state.loading = false; state.educatorInfo = action.payload; state.error = null; },
    loginFail(state, action) { state.loading = false; state.error = action.payload; },
    logout(state) { state.educatorInfo = null; state.error = null; },
  },
});

export const { loginRequest, loginSuccess, loginFail, logout } = educatorSlice.actions;
export default educatorSlice.reducer;
