import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, useSelector } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './lib/i18n';
import { AuthProvider } from './context/AuthContext';
import store from './store/store';
import theme from './theme';
import App from './App';
import AdminApp from './admin/App';
import EducatorApp from './educator/App';
import { MessagingSocketProvider } from './features/messaging';

// ONE query client and ONE socket for all three portals.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

const SessionSocket = ({ children }) => {
  const userInfo = useSelector((state) => state.auth.userInfo);
  return <MessagingSocketProvider enabled={!!userInfo}>{children}</MessagingSocketProvider>;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ChakraProvider theme={theme}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <Router>
              <AuthProvider>
                <SessionSocket>
                  <Routes>
                    <Route path="/*" element={<App />} />
                    <Route path="/admin/*" element={<AdminApp />} />
                    <Route path="/educator/*" element={<EducatorApp />} />
                  </Routes>
                </SessionSocket>
              </AuthProvider>
            </Router>
          </QueryClientProvider>
        </Provider>
      </ChakraProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
