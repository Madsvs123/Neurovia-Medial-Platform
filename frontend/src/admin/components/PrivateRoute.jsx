import React from 'react';
import { AdminRoute } from '../../components/ProtectedRoute';

const PrivateRoute = ({ children }) => {
  return <AdminRoute>{children}</AdminRoute>;
};

export default PrivateRoute;
