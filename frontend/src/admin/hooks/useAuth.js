import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/api';
import { adminLoginRequest, adminLoginSuccess, adminLoginFail, adminLogout } from '../store/adminSlice';
import { setAdminToken, setUserInfo, clearAuthData } from '../../utils/auth';

export const useAuth = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const adminInfo = useSelector((state) => state.admin?.adminInfo);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      dispatch(adminLoginRequest());
      const { data } = await adminLogin({ email, password });
      if (!data.user || data.user.role !== 'admin') {
        const msg = 'Access denied. Admin privileges required.';
        setError(msg);
        dispatch(adminLoginFail(msg));
        return false;
      }

      setAdminToken(data.token);
      setUserInfo(data.user);

      dispatch(adminLoginSuccess(data.user));
      navigate('/admin/dashboard', { replace: true });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      dispatch(adminLoginFail(msg));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    dispatch(adminLogout());
    navigate('/login', { replace: true });
  };

  return { login, logout, error, loading, adminInfo };
};
