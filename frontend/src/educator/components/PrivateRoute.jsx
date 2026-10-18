import React from 'react';
import { EducatorRoute } from '../../components/ProtectedRoute';

const PrivateRoute = ({ children }) => {
  return <EducatorRoute>{children}</EducatorRoute>;
};

export default PrivateRoute;
