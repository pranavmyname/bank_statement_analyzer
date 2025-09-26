import React from 'react';
import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  startIcon,
  ...props 
}) => {
  return (
    <Button
      {...props}
      disabled={loading || disabled}
      startIcon={loading ? <CircularProgress size={16} /> : startIcon}
    >
      {children}
    </Button>
  );
};

export default LoadingButton;
