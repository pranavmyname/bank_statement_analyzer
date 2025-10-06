import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Tab,
  Tabs,
  Stack,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  People,
  Category,
  Storage,
  Add,
  Edit,
  Delete,
  Person,
  Warning,
  Backup,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { usersApi, categoriesApi, databaseApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatDate } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Settings = () => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [userDialog, setUserDialog] = useState({ open: false, user: null, mode: 'add' });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null, mode: 'add' });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [usersResponse, categoriesResponse, statsResponse] = await Promise.all([
        usersApi.getAll(),
        categoriesApi.getAll(),
        databaseApi.getStats(),
      ]);
      
      setUsers(usersResponse.data.users);
      setCurrentUser(usersResponse.data.currentUser);
      setCategories(categoriesResponse.data.categories);
      setDbStats(statsResponse.data);
    } catch (error) {
      showError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (name) => {
    try {
      if (userDialog.mode === 'add') {
        await usersApi.create(name);
        showSuccess('User created successfully');
      } else {
        await usersApi.update(userDialog.user.id, name);
        showSuccess('User updated successfully');
      }
      setUserDialog({ open: false, user: null, mode: 'add' });
      loadAllData();
    } catch (error) {
      showError('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await usersApi.delete(userId);
      showSuccess('User deleted successfully');
      loadAllData();
    } catch (error) {
      showError('Failed to delete user');
    }
  };

  const handleSaveCategory = async (name) => {
    try {
      if (categoryDialog.mode === 'add') {
        await categoriesApi.create(name);
        showSuccess('Category created successfully');
      } else {
        const response = await categoriesApi.update(categoryDialog.category.id, name);
        // Show detailed success message including transaction updates
        if (response.data.updatedTransactions > 0) {
          showSuccess(`Category updated successfully! ${response.data.updatedTransactions} transactions were also updated with the new category name.`);
        } else {
          showSuccess('Category updated successfully');
        }
      }
      setCategoryDialog({ open: false, category: null, mode: 'add' });
      loadAllData();
    } catch (error) {
      showError('Failed to save category');
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const response = await databaseApi.backup();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess('Database backup downloaded');
    } catch (error) {
      showError('Failed to create backup');
    }
  };

  const UsersTab = () => (
    <Box>
      <Card>
        <CardHeader 
          title="Manage Users"
          action={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setUserDialog({ open: true, user: null, mode: 'add' })}
            >
              Add User
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {currentUser && user.id === currentUser.id ? (
                        <Chip label="Current" color="success" size="small" />
                      ) : (
                        <Button size="small" onClick={() => usersApi.switch(user.id).then(() => window.location.reload())}>
                          Switch to
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => setUserDialog({ open: true, user, mode: 'edit' })}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={currentUser && user.id === currentUser.id}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const CategoriesTab = () => (
    <Box>
      <Card>
        <CardHeader 
          title="Manage Categories"
          action={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCategoryDialog({ open: true, category: null, mode: 'add' })}
            >
              Add Category
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={category.isDefault ? 'Default' : 'Custom'} 
                        color={category.isDefault ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            disabled={category.isDefault}
                            onClick={() => setCategoryDialog({ open: true, category, mode: 'edit' })}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={category.isDefault}
                            onClick={() => categoriesApi.delete(category.id).then(() => loadAllData())}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const DatabaseTab = () => (
    <Box>
      <Grid container spacing={3}>
        {dbStats && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Database Statistics" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="h4" color="primary">{dbStats.total.users}</Typography>
                    <Typography variant="body2">Total Users</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="h4" color="success.main">{dbStats.total.transactions.toLocaleString()}</Typography>
                    <Typography variant="body2">Total Transactions</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="h4" color="info.main">{dbStats.total.categories}</Typography>
                    <Typography variant="body2">Categories</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="h4" color="warning.main">{dbStats.total.files}</Typography>
                    <Typography variant="body2">Files</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Database Actions" />
            <CardContent>
              <Stack spacing={3}>
                <Button
                  variant="contained"
                  startIcon={<Backup />}
                  onClick={handleBackupDatabase}
                >
                  Create Backup
                </Button>
                <Alert severity="info">
                  More database management features are available. Contact admin for advanced operations.
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      <Card>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Users" icon={<People />} />
          <Tab label="Categories" icon={<Category />} />
          <Tab label="Database" icon={<Storage />} />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <UsersTab />}
          {activeTab === 1 && <CategoriesTab />}
          {activeTab === 2 && <DatabaseTab />}
        </Box>
      </Card>

      {/* User Dialog */}
      <FormDialog
        open={userDialog.open}
        title={userDialog.mode === 'add' ? 'Add User' : 'Edit User'}
        label="User Name"
        defaultValue={userDialog.user?.name || ''}
        onClose={() => setUserDialog({ open: false, user: null, mode: 'add' })}
        onSave={handleSaveUser}
      />

      {/* Category Dialog */}
      <FormDialog
        open={categoryDialog.open}
        title={categoryDialog.mode === 'add' ? 'Add Category' : 'Edit Category'}
        label="Category Name"
        defaultValue={categoryDialog.category?.name || ''}
        onClose={() => setCategoryDialog({ open: false, category: null, mode: 'add' })}
        onSave={handleSaveCategory}
        showTransactionWarning={categoryDialog.mode === 'edit'}
      />
    </Box>
  );
};

// Reusable Form Dialog
const FormDialog = ({ open, title, label, defaultValue, onClose, onSave, showTransactionWarning = false }) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(defaultValue || '');
  }, [defaultValue, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(value.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {showTransactionWarning && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Changing this category name will automatically update all transactions that use this category.
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            label={label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={saving}
            disabled={!value.trim()}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Settings;