import Cookies from 'js-cookie';

const COOKIE_OPTIONS = {
  expires: 30,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  path: '/'
};

// ── User Token ──
export const getUserToken = () => Cookies.get('userToken');
export const setUserToken = (token) => Cookies.set('userToken', token, COOKIE_OPTIONS);
export const removeUserToken = () => Cookies.remove('userToken', { path: '/' });

// ── User Info ──
export const getUserInfo = () => {
  const raw = Cookies.get('userInfo');
  return raw ? JSON.parse(raw) : null;
};
export const setUserInfo = (info) => Cookies.set('userInfo', JSON.stringify(info), COOKIE_OPTIONS);
export const removeUserInfo = () => Cookies.remove('userInfo', { path: '/' });

// ── Admin Token ──
export const getAdminToken = () => Cookies.get('adminToken') || getUserToken();
export const setAdminToken = (token) => {
  Cookies.set('adminToken', token, COOKIE_OPTIONS);
  setUserToken(token);
};
export const removeAdminToken = () => Cookies.remove('adminToken', { path: '/' });

// ── Auth Checks ──
export const isAuthenticated = () => {
  const token = getUserToken();
  const info = getUserInfo();
  return !!token && !!info;
};
export const isAdminAuthenticated = () => {
  const token = getAdminToken();
  const info = getUserInfo();
  return !!token && !!info && info.role === 'admin';
};

// ── Clear All ──
export const clearAuthData = () => {
  removeUserToken();
  removeUserInfo();
  removeAdminToken();
};

// ── Auth Header ──
export const getAuthHeader = () => {
  const token = getUserToken();
  return token ? { authorization: `Bearer ${token}` } : {};
};
export const getAdminAuthHeader = () => {
  const token = getAdminToken();
  return token ? { authorization: `Bearer ${token}` } : {};
};
