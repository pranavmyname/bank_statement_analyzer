import { useState, useEffect, useContext, createContext } from 'react';
import { useStackApp, useUser } from '@stackframe/react';
import { setAuthToken } from '../services/api';

// Create Auth Context for backward compatibility
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const stackApp = useStackApp();
  const user = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const logout = async (reason = 'user_logout') => {
    try {
      console.log(`🔐 Logging out... Reason: ${reason}`);
      await stackApp.signOut();
      setAuthToken(null);
      setCurrentUserId(null);
      
      // If logging out due to unauthorized access, show message
      if (reason === 'unauthorized') {
        window.alert('Access denied: Your email address is not authorized to access this application.');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Listen for unauthorized email access events
  useEffect(() => {
    const handleUnauthorizedEmail = (event) => {
      console.error('🚫 Unauthorized email access detected:', event.detail);
      logout('unauthorized');
    };

    window.addEventListener('email-not-authorized', handleUnauthorizedEmail);
    return () => {
      window.removeEventListener('email-not-authorized', handleUnauthorizedEmail);
    };
  }, [logout]);

  // Sync authentication state with Neon Auth
  useEffect(() => {
    const syncAuthState = async () => {
      setIsLoading(true);
      console.log('🔐 Auth state sync - User:', user ? 'authenticated' : 'not authenticated');
      
      if (user) {
        console.log('🔐 User authenticated with Neon Auth:', {
          id: user.id,
          email: user.primaryEmail,
          displayName: user.displayName
        });
        
        try {
          // Use the official Neon Auth API method as per documentation
          console.log('🔐 Getting access token using getAuthJson()...');
          const authJson = await user.getAuthJson();
          console.log('🔐 Auth JSON received:', authJson);
          
          const accessToken = authJson?.accessToken;
          console.log('🔐 Access token available:', accessToken ? '✅' : '❌');
          
          if (accessToken) {
            setAuthToken(accessToken);
            console.log(`🔐 JWT token set for user: ${user.primaryEmail}`);
            console.log('🔐 Token preview:', accessToken.substring(0, 50) + '...');
          } else {
            console.log('⚠️ No access token found in authJson');
            setAuthToken(null);
          }
          
          setCurrentUserId(user.id);
        } catch (tokenError) {
          console.error('🔐 Failed to get access token:', tokenError);
          console.error('🔐 Error details:', tokenError.message);
          // If token retrieval fails, still allow UI access but warn
          console.log('⚠️ Proceeding without JWT - backend will use default user ID');
          setCurrentUserId(user.id);
          setAuthToken(null);
        }
        
        setIsLoading(false);
      } else {
        console.log('🔐 No user authenticated');
        setAuthToken(null);
        setCurrentUserId(null);
        setIsLoading(false);
      }
    };

    syncAuthState();
  }, [user]);

  const checkAuthStatus = async () => {
    // This is handled automatically by Neon Auth hooks
    console.log('🔐 Auth status check - user:', user ? 'authenticated' : 'not authenticated');
    return user ? { authenticated: true, user } : { authenticated: false };
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
