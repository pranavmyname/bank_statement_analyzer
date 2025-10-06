import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
} from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { SignIn } from '@stackframe/react';
import { useAuth } from '../hooks/useAuth';

const TokenEntry = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    console.log('🚀 TokenEntry: Auth state changed:', isAuthenticated);
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      console.log('🚀 TokenEntry: Redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={8} sx={{ borderRadius: 2 }}>
          <CardHeader
            avatar={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #2196F3, #1976D2)',
                  color: 'white',
                }}
              >
                <TrendingUp />
              </Box>
            }
            title={
              <Typography variant="h4" component="h1" fontWeight="bold">
                Expense Tracker
              </Typography>
            }
            subheader={
              <Typography variant="subtitle1" color="text.secondary">
                Analyze your financial statements with AI
              </Typography>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" align="center" gutterBottom>
              Sign in to continue
            </Typography>
            
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Use your Google or Microsoft account to access the dashboard
            </Typography>
            
            {/* Neon Auth SignIn Component */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <SignIn />
            </Box>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Secure authentication powered by Neon Auth
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default TokenEntry;