import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { StackProvider, StackTheme, StackHandler } from '@stackframe/react';
import { stackClientApp } from './stack';
import { theme } from './theme/theme';
import { AuthProvider } from './hooks/useAuth';
import { NotificationProvider } from './hooks/useNotification';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationContainer from './components/NotificationContainer';
import TokenEntry from './pages/TokenEntry';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import SelectPages from './pages/SelectPages';
import ReviewTransactions from './pages/ReviewTransactions';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Duplicates from './pages/Duplicates';
import Settings from './pages/Settings';

// StackHandler component for auth routing
function HandlerRoutes() {
  const location = useLocation();
  return (
    <StackHandler app={stackClientApp} location={location.pathname} fullPage />
  );
}

function App() {
  return (
    <Suspense fallback={null}>
      <Router>
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <NotificationProvider>
                <AuthProvider>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Routes>
                      {/* Neon Auth Handler Routes */}
                      <Route path="/handler/*" element={<HandlerRoutes />} />
                      
                      {/* Public Routes */}
                      <Route path="/login" element={<TokenEntry />} />
                      
                      {/* Protected Routes */}
                      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="upload" element={<Upload />} />
                        <Route path="select-pages" element={<SelectPages />} />
                        <Route path="review-transactions" element={<ReviewTransactions />} />
                        <Route path="transactions" element={<Transactions />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="duplicates" element={<Duplicates />} />
                        <Route path="settings" element={<Settings />} />
                      </Route>
                      
                      {/* Fallback route */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                    
                    {/* Global notification container */}
                    <NotificationContainer />
                  </Box>
                </AuthProvider>
              </NotificationProvider>
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </Router>
    </Suspense>
  );
}

export default App;