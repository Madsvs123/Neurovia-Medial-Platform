import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import adminReducer from '../admin/store/adminSlice';
import educatorReducer from '../educator/store/educatorSlice';

/**
 * The one Redux store for all three portals. The admin and educator apps
 * used to mount their own nested <Provider> + <QueryClientProvider>, which
 * meant caches/state didn't cross portal boundaries.
 */
const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    educator: educatorReducer,
  },
});

export default store;
