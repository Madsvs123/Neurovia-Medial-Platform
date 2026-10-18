import { createSlice } from '@reduxjs/toolkit';
import { getUserInfo, setUserToken, setUserInfo } from '../../utils/auth';
import { googleAuth } from '../../services/api';

const initialState = {
  userInfo: getUserInfo(),
  loading: false,
  error: null,
  success: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.userInfo = action.payload;
      state.error = null;
      state.success = true;
    },
    loginFail: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.success = false;
    },
    registerRequest: (state) => {
      state.loading = true;
      state.error = null;
      state.success = false;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.userInfo = action.payload;
      state.error = null;
      state.success = true;
    },
    registerFail: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.success = false;
    },
    logout: (state) => {
      state.userInfo = null;
      state.error = null;
      state.success = false;
    },
    clearError: (state) => { state.error = null; },
    updateUserInfo: (state, action) => {
      state.userInfo = { ...state.userInfo, ...action.payload };
    },
  },
});

export const {
  loginRequest, loginSuccess, loginFail,
  registerRequest, registerSuccess, registerFail,
  logout, clearError, updateUserInfo,
} = authSlice.actions;

export const googleLogin = (credential) => async (dispatch) => {
  try {
    dispatch(loginRequest());
    const { data } = await googleAuth(credential);
    if (data.token) {
      setUserToken(data.token);
      setUserInfo(data.user);
    }
    dispatch(loginSuccess(data.user));
    return { success: true, user: data.user };
  } catch (err) {
    const message = err.response?.data?.message || 'Google authentication failed';
    dispatch(loginFail(message));
    return { success: false, error: message };
  }
};

export default authSlice.reducer;
