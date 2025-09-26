import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  Paper,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { NavigateNext, Lock } from '@mui/icons-material';
import { filesApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import LoadingButton from '../components/LoadingButton';

const SelectPages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError } = useNotification();

  const [password, setPassword] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [pages, setPages] = useState([]);
  const [requiresPassword, setRequiresPassword] = useState(searchParams.get('requiresPassword') === 'true');

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const response = await filesApi.process({
        password: requiresPassword ? password : undefined,
        selectedPages: selectedPages.length > 0 ? selectedPages : undefined
      });

      if (response.data.requiresPassword) {
        setRequiresPassword(true);
        return;
      }

      if (response.data.requiresPageSelection) {
        setPages(response.data.pages);
        return;
      }

      if (response.data.success) {
        navigate('/review-transactions');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Process File
      </Typography>

      {requiresPassword && (
        <Card sx={{ mb: 3 }}>
          <CardHeader 
            title="Password Required"
            avatar={<Lock color="warning" />}
          />
          <CardContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This PDF is password protected. Please provide the password to continue.
            </Alert>
            <TextField
              fullWidth
              label="PDF Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <LoadingButton
              variant="contained"
              loading={processing}
              onClick={handleProcess}
              disabled={!password.trim()}
            >
              Process with Password
            </LoadingButton>
          </CardContent>
        </Card>
      )}

      {pages.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Select Pages to Process" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select the pages you want to process (up to 4 pages):
            </Typography>
            {pages.slice(0, 4).map((page, index) => (
              <FormControlLabel
                key={index}
                control={
                  <Checkbox
                    checked={selectedPages.includes(index + 1)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPages([...selectedPages, index + 1]);
                      } else {
                        setSelectedPages(selectedPages.filter(p => p !== index + 1));
                      }
                    }}
                  />
                }
                label={`Page ${index + 1}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <LoadingButton
            variant="contained"
            size="large"
            loading={processing}
            onClick={handleProcess}
            startIcon={<NavigateNext />}
            disabled={requiresPassword && !password.trim()}
          >
            {processing ? 'Processing...' : 'Continue Processing'}
          </LoadingButton>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SelectPages;
