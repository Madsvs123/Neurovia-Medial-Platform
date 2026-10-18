import React from 'react';
import { Navigate } from 'react-router-dom';
import { isEducator } from '../utils/auth';

const PublicRoute = ({ children }) => {
  if (isEducator()) {
    return <Navigate to="/educator/dashboard" replace />;
  }
  return children;
};

export default PublicRoute;
