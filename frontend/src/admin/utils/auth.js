import Cookies from 'js-cookie';
import {
  getUserInfo,
  clearAuthData as clearRootAuthData,
} from '../../utils/auth';

const COOKIE_OPTIONS = {
  expires: 30,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path: '/',
};

export const isAdminAuthenticated = () => {
  const token = Cookies.get('adminToken');
  const info = getUserInfo();
  return !!token && !!info && info.role === 'admin';
};

export const getAdminToken = () => Cookies.get('adminToken');
export const setAdminToken = (token) => Cookies.set('adminToken', token, COOKIE_OPTIONS);
export const clearAdminToken = () => Cookies.remove('adminToken', { path: '/' });
export const clearAuthData = clearRootAuthData;
