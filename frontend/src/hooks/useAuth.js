import { useState, useEffect, useContext, createContext } from 'react';
import { authApi } from '../services/api';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getStatus();
      
      // console.log('Auth status response:', response.status, response.data); // Debug log
      
      // Handle 304 status - user is still authenticated
      if (response.status === 304) {
        setIsAuthenticated(true);
        // Keep existing currentUserId if we have it, since 304 means no change
      } else if (response.data) {
        setIsAuthenticated(response.data.authenticated);
        setCurrentUserId(response.data.currentUserId);
      } else {
        // Fallback if no data
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setCurrentUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token) => {
    try {
      const response = await authApi.verifyToken(token);
      if (response.data.success) {
        setIsAuthenticated(true);
        await checkAuthStatus(); // Get user ID
        return { success: true, message: response.data.message };
      }
      return { success: false, message: 'Authentication failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Authentication failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUserId(null);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    currentUserId,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
