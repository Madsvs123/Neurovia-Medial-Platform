import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, register as registerApi, googleAuth as googleAuthApi } from '../services/api';
import {
  loginRequest, loginSuccess, loginFail,
  registerRequest, registerSuccess, registerFail,
  logout,
} from '../store/slices/authSlice';
import {
  setUserToken, setUserInfo, removeUserToken, removeUserInfo,
  getUserToken, getUserInfo, isAuthenticated as checkAuth,
} from '../utils/auth';

export const useAuth = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo } = useSelector((state) => state.auth);
  const isAuthenticated = checkAuth();

  const loginUser = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      dispatch(loginRequest());
      const { data } = await loginApi({ email, password });
      if (data.token) {
        setUserToken(data.token);
        setUserInfo(data.user);
      }
      dispatch(loginSuccess(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      dispatch(loginFail(message));
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      dispatch(registerRequest());
      const { data } = await registerApi(userData);
      if (data.token) {
        setUserToken(data.token);
        setUserInfo(data.user);
      }
      dispatch(registerSuccess(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      dispatch(registerFail(message));
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = () => {
    removeUserToken();
    removeUserInfo();
    dispatch(logout());
    navigate('/login');
  };

  const googleLogin = async (credential) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await googleAuthApi(credential);
      if (data.token) {
        setUserToken(data.token);
        setUserInfo(data.user);
      }
      dispatch(loginSuccess(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      const message = err.response?.data?.message || 'Google authentication failed';
      setError(message);
      dispatch(loginFail(message));
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    user: userInfo,
    isAuthenticated,
    loading,
    error,
    login: loginUser,
    register: registerUser,
    googleLogin,
    logout: logoutUser,
    setError,
  };
};
