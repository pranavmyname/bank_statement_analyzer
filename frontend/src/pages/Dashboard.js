import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  CloudUpload,
  List as ListIcon,
  Analytics,
  FindInPage,
  Settings,
  Description,
  PictureAsPdf,
  TableChart,
  Refresh,
} from '@mui/icons-material';
import { transactionsApi, filesApi, usersApi, analyticsApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency, formatDate, formatFileSize, getMonthName } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [dateRanges, setDateRanges] = useState({ years: [], months: [] });
  const [accountIds, setAccountIds] = useState([]);

  // Filter states
  const [selectedYear, setSelectedYear] = useState(searchParams.get('year') || '');
  const [selectedMonth, setSelectedMonth] = useState(searchParams.get('month') || '');
  const [selectedAccountType, setSelectedAccountType] = useState(searchParams.get('accountType') || '');
  const [selectedAccountId, setSelectedAccountId] = useState(searchParams.get('accountId') || '');

  useEffect(() => {
    loadDashboardData();
    loadDateRanges();
    loadUsers();
    loadAccountIds();
  }, [selectedYear, selectedMonth, selectedAccountType, selectedAccountId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Build filter params
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedAccountType) params.accountType = selectedAccountType;
      if (selectedAccountId) params.account_id = selectedAccountId;

      // Load summary and recent files
      const [summaryResponse, filesResponse] = await Promise.all([
        transactionsApi.getSummary(params),
        filesApi.getRecent(5),
      ]);

      setSummary(summaryResponse.data);
      setRecentFiles(filesResponse.data.files);

      // Update URL params
      const newParams = new URLSearchParams();
      if (selectedYear) newParams.set('year', selectedYear);
      if (selectedMonth) newParams.set('month', selectedMonth);
      if (selectedAccountType) newParams.set('accountType', selectedAccountType);
      setSearchParams(newParams);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDateRanges = async () => {
    try {
      const response = await analyticsApi.getDateRanges();
      setDateRanges(response.data);
      
      // Set default year if none selected
      if (!selectedYear && response.data.years.length > 0) {
        setSelectedYear(response.data.years[0].toString());
      }
    } catch (error) {
      console.error('Error loading date ranges:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.users);
      setCurrentUser(response.data.currentUser);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAccountIds = async () => {
    try {
      const response = await analyticsApi.getAccountIds();
      setAccountIds(response.data?.accountIds || []);
    } catch (error) {
      console.error('Error loading account IDs:', error);
      setAccountIds([]);
    }
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'year') {
      setSelectedYear(value);
      setSelectedMonth(''); // Reset month when year changes
    } else if (filterType === 'month') {
      setSelectedMonth(value);
    } else if (filterType === 'accountType') {
      setSelectedAccountType(value);
    } else if (filterType === 'accountId') {
      setSelectedAccountId(value);
    }
  };

  const clearFilters = () => {
    setSelectedMonth('');
    setSelectedAccountType('');
    setSelectedAccountId('');
    // Keep year as it's the primary filter
  };

  const getFilteredMonths = () => {
    if (!selectedYear) return [];
    return dateRanges.months.filter(month => month.year === parseInt(selectedYear));
  };

  // Summary cards data
  const summaryCards = [
    {
      title: 'Total Transactions',
      value: summary?.totalTransactions || 0,
      icon: <ListIcon color="primary" />,
      color: 'primary',
      isNumber: true,
    },
    {
      title: 'Total Credits',
      value: summary?.totalCredits || 0,
      icon: <TrendingUp color="success" />,
      color: 'success',
      isCurrency: true,
    },
    {
      title: 'Total Expenses',
      value: summary?.totalExpenses || 0,
      icon: <TrendingDown color="error" />,
      color: 'error',
      isCurrency: true,
    },
    {
      title: 'Net Balance',
      value: summary?.netBalance || 0,
      icon: <AccountBalance color="info" />,
      color: summary?.netBalance >= 0 ? 'info' : 'warning',
      isCurrency: true,
    },
  ];

  const quickActions = [
    {
      title: 'Upload Statement',
      description: 'Upload and process new bank statements',
      icon: <CloudUpload />,
      color: 'primary',
      path: '/upload',
    },
    {
      title: 'View Transactions',
      description: 'Browse and manage your transactions',
      icon: <ListIcon />,
      color: 'success',
      path: '/transactions',
    },
    {
      title: 'Find Duplicates',
      description: 'Identify and manage duplicate transactions',
      icon: <FindInPage />,
      color: 'warning',
      path: '/duplicates',
    },
    {
      title: 'Settings',
      description: 'Manage users and categories',
      icon: <Settings />,
      color: 'secondary',
      path: '/settings',
    },
  ];

  const getFileIcon = (fileType) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <PictureAsPdf color="error" />;
      case 'csv': 
      case 'xls':
      case 'xlsx': return <TableChart color="success" />;
      default: return <Description />;
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <LoadingButton
          variant="outlined"
          startIcon={<Refresh />}
          loading={loading}
          onClick={loadDashboardData}
        >
          Refresh
        </LoadingButton>
      </Box>

      {/* User Selection */}
      {currentUser && (
        <Card sx={{ mb: 4 }}>
          <CardHeader title="User Selection" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">Current User:</Typography>
              <Chip
                label={currentUser.name}
                color="primary"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Filter Dashboard Data" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 160 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  label="Year"
                >
                  {dateRanges.years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                <InputLabel>Month (Optional)</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  label="Month (Optional)"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem value="">All Months</MenuItem>
                  {getFilteredMonths().map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 200 }}>
                <InputLabel>Account Type (Optional)</InputLabel>
                <Select
                  value={selectedAccountType}
                  onChange={(e) => handleFilterChange('accountType', e.target.value)}
                  label="Account Type (Optional)"
                >
                  <MenuItem value="">All Accounts</MenuItem>
                  <MenuItem value="bank_account">Bank Account</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                <InputLabel>Account ID (Optional)</InputLabel>
                <Select
                  value={selectedAccountId}
                  onChange={(e) => handleFilterChange('accountId', e.target.value)}
                  label="Account ID (Optional)"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem value="">All Account IDs</MenuItem>
                  {accountIds.map((id) => (
                    <MenuItem key={id} value={id}>
                      {id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={clearFilters}
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
          
          {/* Filter Status */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing data for:{' '}
              {selectedMonth && selectedYear
                ? `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`
                : selectedYear
                ? `Year ${selectedYear}`
                : 'All time'}
              {selectedAccountType && (
                <> • {selectedAccountType === 'bank_account' ? 'Bank Account' : 'Credit Card'}</>
              )}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box>{card.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" color={`${card.color}.main`}>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {card.isCurrency
                        ? formatCurrency(card.value)
                        : card.isNumber
                        ? card.value.toLocaleString()
                        : card.value}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Recent Files */}
        <Grid item xs={12} md={6} lg={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardHeader 
              title="Recent Uploads" 
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              action={
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => navigate('/upload')}
                  size="small"
                >
                  Upload New
                </Button>
              }
              sx={{ 
                pb: 1,
                '& .MuiCardHeader-action': {
                  mt: 0.5,
                  ml: 2
                }
              }}
            />
            <CardContent>
              {recentFiles.length > 0 ? (
                <List>
                  {recentFiles.map((file, index) => (
                    <React.Fragment key={file.id}>
                      <ListItem>
                        <ListItemIcon>{getFileIcon(file.fileType)}</ListItemIcon>
                        <ListItemText
                          primary={file.originalFilename}
                          secondary={
                            <>
                              {formatDate(file.uploadedAt)} • {formatFileSize(file.fileSize)}
                              {file.processed && (
                                <Chip
                                  label={`${file.transactionsCount} transactions`}
                                  size="small"
                                  color="success"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </>
                          }
                        />
                      </ListItem>
                      {index < recentFiles.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CloudUpload sx={{ fontSize: 48, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    No files uploaded yet
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/upload')}
                    sx={{ mt: 2 }}
                  >
                    Upload Your First File
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={6} lg={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardHeader 
              title="Expense Categories" 
              titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              action={
                <Button
                  variant="outlined"
                  onClick={() => navigate('/transactions')}
                  size="small"
                >
                  View All
                </Button>
              }
              sx={{ 
                pb: 1,
                '& .MuiCardHeader-action': {
                  mt: 0.5,
                  ml: 3  // More space for longer title
                }
              }}
            />
            <CardContent>
              {summary?.categoryBreakdown && Object.keys(summary.categoryBreakdown).length > 0 ? (
                <List>
                  {Object.entries(summary.categoryBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8) // Show top 8 categories
                    .map(([category, amount]) => (
                      <ListItem key={category}>
                        <ListItemText
                          primary={category}
                          secondary={formatCurrency(amount)}
                        />
                        <Chip
                          label={`${((amount / summary.totalExpenses) * 100).toFixed(1)}%`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Analytics sx={{ fontSize: 48, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    No expense data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mt: 4 }}>
        <CardHeader title="Quick Actions" />
        <CardContent>
          <Grid container spacing={3}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => navigate(action.path)}
                >
                  <Box sx={{ color: `${action.color}.main`, mb: 2 }}>
                    {React.cloneElement(action.icon, { sx: { fontSize: 48 } })}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
