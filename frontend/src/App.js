import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, GlobalStyles } from '@mui/material';
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
              <GlobalStyles
                styles={{
                  // Custom styles for Neon Auth UserButton
                  '[data-stack-component="user-button"]': {
                    '& > button': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'white !important',
                      backgroundColor: 'transparent !important',
                      border: 'none !important',
                      padding: '8px 12px !important',
                      borderRadius: '8px !important',
                      cursor: 'pointer !important',
                      fontSize: '14px !important',
                      fontWeight: '500 !important',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
                      },
                    },
                    // Dropdown menu styles
                    '& [role="menu"], & .stack-dropdown': {
                      backgroundColor: 'white !important',
                      border: '1px solid #e0e0e0 !important',
                      borderRadius: '8px !important',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1) !important',
                      padding: '8px 0 !important',
                      minWidth: '280px !important',
                      zIndex: '9999 !important',
                      marginTop: '8px !important',
                    },
                    // Menu item styles
                    '& [role="menuitem"], & .stack-menu-item': {
                      display: 'block !important',
                      padding: '12px 16px !important',
                      color: '#333 !important',
                      fontSize: '14px !important',
                      lineHeight: '1.4 !important',
                      whiteSpace: 'normal !important',
                      overflow: 'visible !important',
                      textOverflow: 'clip !important',
                      wordWrap: 'break-word !important',
                      maxWidth: 'none !important',
                      width: '100% !important',
                      '&:hover': {
                        backgroundColor: '#f5f5f5 !important',
                      },
                    },
                    // User name and email specific styles
                    '& .stack-user-name': {
                      fontWeight: '600 !important',
                      color: '#333 !important',
                      marginBottom: '4px !important',
                    },
                    '& .stack-user-email': {
                      color: '#666 !important',
                      fontSize: '12px !important',
                      opacity: '0.8 !important',
                    },
                  },
                }}
              />
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