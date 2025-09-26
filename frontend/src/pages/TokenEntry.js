import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import LoadingButton from '../components/LoadingButton';

const TokenEntry = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please enter the access token');
      return;
    }

    setLoading(true);
    try {
      const result = await login(token.trim());
      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Authentication failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={3}>
          <CardHeader
            avatar={<TrendingUp color="primary" sx={{ fontSize: 32 }} />}
            title={
              <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
                Expense Tracker
              </Typography>
            }
            subheader="Enter your access token to continue"
            sx={{ textAlign: 'center', pb: 0 }}
          />
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Access Token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your access token"
                disabled={loading}
                autoFocus
                sx={{ mb: 2 }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <LoadingButton
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                loading={loading}
                sx={{ mb: 2 }}
              >
                Access Application
              </LoadingButton>

              <Paper
                elevation={0}
                sx={{
                  backgroundColor: 'info.main',
                  color: 'info.contrastText',
                  p: 2,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  What can you do with this app?
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  • Upload and analyze bank statements (PDF, CSV, Excel)
                  <br />
                  • Automatically categorize transactions using AI
                  <br />
                  • View detailed analytics and spending insights
                  <br />
                  • Manage multiple users and accounts
                  <br />
                  • Export data and find duplicate transactions
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default TokenEntry;
