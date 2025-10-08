import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  List as TransactionsIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  FileCopy as DuplicatesIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useUser, useStackApp } from '@stackframe/react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { usersApi } from '../services/api';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showError, showSuccess } = useNotification();

  // Neon Auth hooks
  const user = useUser();
  const stackApp = useStackApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // Fetch users and current user on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.users);
      setCurrentUser(response.data.currentUser);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSwitchUser = async (userId) => {
    try {
      const response = await usersApi.switch(userId);
      setCurrentUser(response.data.currentUser);
      showSuccess(response.data.message);
      
      // Refresh the page to update all data
      window.location.reload();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to switch user');
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // User menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await stackApp.signOut();
      handleUserMenuClose();
      showSuccess('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      showError('Failed to logout');
    }
  };

  const handleAccountSettings = () => {
    handleUserMenuClose();
    // Navigate to account settings - you can implement this route if needed
    navigate('/handler/account-settings');
  };

  const navigationItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Upload', icon: <UploadIcon />, path: '/upload' },
    { text: 'Transactions', icon: <TransactionsIcon />, path: '/transactions' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Find Duplicates', icon: <DuplicatesIcon />, path: '/duplicates' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo192.png" 
            alt="PinePocket Logo" 
            style={{ 
              height: '28px', 
              marginRight: '12px',
              objectFit: 'contain'
            }} 
          />
          <Typography variant="h6" noWrap component="div">
            PinePocket
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="/logo512.png" 
              alt="PinePocket Logo" 
              style={{ 
                height: '56px', 
                marginRight: '12px',
                objectFit: 'contain'
              }} 
            />
            <Typography variant="h2" noWrap component="div">
              PinePocket
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          {/* Custom User Menu */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                onClick={handleUserMenuOpen}
                color="inherit"
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    src={user.profileImageUrl} 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: 'secondary.main',
                      fontSize: '0.875rem'
                    }}
                  >
                    {user.displayName?.charAt(0) || user.primaryEmail?.charAt(0) || 'U'}
                  </Avatar>
                  <Box sx={{ 
                    display: { xs: 'none', sm: 'block' },
                    textAlign: 'left',
                    color: 'inherit'
                  }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.2, color: 'inherit' }}>
                      {user.displayName || 'User'}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      opacity: 0.8,
                      color: 'inherit',
                      display: 'block',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.primaryEmail}
                    </Typography>
                  </Box>
                </Box>
              </Button>

              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    mt: 1,
                    minWidth: 280,
                    borderRadius: '8px',
                    '& .MuiMenuItem-root': {
                      px: 2,
                      py: 1.5,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* User Info Header */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {user.displayName || 'User Account'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {user.primaryEmail}
                  </Typography>
                  {user.primaryEmailVerified && (
                    <Chip
                      label="Verified"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1, height: '20px', fontSize: '0.75rem' }}
                    />
                  )}
                </Box>

                {/* Menu Items */}
                <MenuItem onClick={handleAccountSettings}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Account Settings" />
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText primary="Sign Out" />
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button
              color="inherit"
              onClick={() => navigate('/login')}
              startIcon={<AccountCircleIcon />}
            >
              Sign In
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
