import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import store from './store/store';
import theme from './theme';
import App from './App';
import AdminApp from './admin/App';
import EducatorApp from './educator/App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ChakraProvider theme={theme}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <Router>
              <AuthProvider>
                <Routes>
                  <Route path="/*" element={<App />} />
                  <Route path="/admin/*" element={<AdminApp />} />
                  <Route path="/educator/*" element={<EducatorApp />} />
                </Routes>
              </AuthProvider>
            </Router>
          </QueryClientProvider>
        </Provider>
      </ChakraProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
