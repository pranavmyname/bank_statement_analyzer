import { useState, useEffect, useContext, createContext } from 'react';
import { useStackApp, useUser } from '@stackframe/stack';
import { authApi, setAuthToken } from '../services/api';

// Create Auth Context for backward compatibility
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const stackApp = useStackApp();
  const user = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Sync authentication state with Neon Auth
  useEffect(() => {
    const syncAuthState = async () => {
      setIsLoading(true);
      
      if (user) {
        console.log('🔐 User authenticated with Neon Auth:', user);
        
        // Get the access token from Neon Auth
        const accessToken = await stackApp.getAccessToken();
        console.log('🔐 Access token received:', accessToken ? '✅' : '❌');
        
        if (accessToken) {
          // Set the JWT token for API requests
          setAuthToken(accessToken.accessToken);
          setCurrentUserId(user.id);
          
          try {
            // Verify token with backend
            const response = await authApi.verifyJWT();
            console.log('🔐 Backend JWT verification:', response.data);
          } catch (error) {
            console.error('🔐 Backend JWT verification failed:', error);
          }
        }
      } else {
        console.log('🔐 No user authenticated');
        setAuthToken(null);
        setCurrentUserId(null);
      }
      
      setIsLoading(false);
    };

    syncAuthState();
  }, [user, stackApp]);

  const checkAuthStatus = async () => {
    // This is handled automatically by Neon Auth hooks
    console.log('🔐 Auth status check - user:', user ? 'authenticated' : 'not authenticated');
    return user ? { authenticated: true, user } : { authenticated: false };
  };

  const logout = async () => {
    try {
      console.log('🔐 Logging out...');
      await stackApp.signOut();
      setAuthToken(null);
      setCurrentUserId(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    isAuthenticated: !!user,
    isLoading,
    currentUserId,
    user,
    login: null, // Login is handled by Neon Auth components
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
