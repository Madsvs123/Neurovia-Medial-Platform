import Cookies from 'js-cookie';

export const isEducator = () => {
  const raw = Cookies.get('userInfo');
  if (!raw) return false;
  try {
    const info = JSON.parse(raw);
    return info.role === 'educator';
  } catch {
    return false;
  }
};

export const isAdmin = () => {
  const raw = Cookies.get('userInfo');
  if (!raw) return false;
  try {
    const info = JSON.parse(raw);
    return info.role === 'admin';
  } catch {
    return false;
  }
};

export const isEducatorOrAdmin = () => {
  const raw = Cookies.get('userInfo');
  if (!raw) return false;
  try {
    const info = JSON.parse(raw);
    return info.role === 'educator' || info.role === 'admin';
  } catch {
    return false;
  }
};

export const getUserInfo = () => {
  const raw = Cookies.get('userInfo');
  return raw ? JSON.parse(raw) : null;
};
