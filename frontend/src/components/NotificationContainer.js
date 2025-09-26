import React from 'react';
import { Alert, Snackbar, Stack } from '@mui/material';
import { useNotification } from '../hooks/useNotification';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 80, // Below the AppBar
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
        width: '100%',
      }}
    >
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={null} // We handle duration in the hook
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            severity={notification.type}
            onClose={() => removeNotification(notification.id)}
            variant="filled"
            sx={{ width: '100%', mb: 1 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default NotificationContainer;
