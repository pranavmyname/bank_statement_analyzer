import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Grid, Button, Card, CardContent, CardHeader,
  Select, MenuItem, FormControl, InputLabel, Alert, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Container,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Insights, PieChart, Timeline, AccountBalance,
  TableChart, Close, Download, CalendarToday, FilterList, Clear,
  FileDownload, Assessment,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { analyticsApi, transactionsApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Analytics = () => {
  const { showError, showSuccess } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: '',
    accountType: '',
    accountId: '',
  });
  const [categories, setCategories] = useState([]);
  const [accountIds, setAccountIds] = useState([]);
  
  // Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    category: '',
    transactions: [],
    totalAmount: 0,
    count: 0,
    loading: false,
  });

  // Pie chart visibility state for category selection/deselection (like Plotly)
  const [hiddenCategories, setHiddenCategories] = useState(new Set());

  // Chart Colors
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
  ];

  // Load analytics data
  const loadAnalyticsData = useCallback(async (filtersToUse) => {
    try {
      setLoading(true);
      const response = await analyticsApi.getAnalytics(filtersToUse);
      setData(response.data || {});
      setStats(response.stats || {});
      setCategories(response.categories || []);
      setAccountIds(response.accountIds || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadAnalytics = (filtersToUse = filters) => {
    loadAnalyticsData(filtersToUse);
  };

  useEffect(() => {
    // Only load analytics on initial mount
    loadAnalyticsData({});
  }, [loadAnalyticsData]);

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      category: '',
      accountType: '',
      accountId: '',
    });
  };

  const setQuickDateFilter = (period) => {
    const today = new Date();
    let fromDate;
    
    switch (period) {
      case 'last30':
        fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'thisYear':
        fromDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      dateFrom: fromDate.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    }));
  };

  // Handle legend click to show/hide categories (like Plotly)
  const handleLegendClick = (entry) => {
    const categoryName = entry.value;
    setHiddenCategories(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(categoryName)) {
        // Category is hidden, show it
        newHidden.delete(categoryName);
      } else {
        // Category is visible, hide it
        newHidden.add(categoryName);
      }
      return newHidden;
    });
  };

  // Get visible pie chart data (excluding hidden categories)
  const getVisiblePieData = () => {
    if (!data.categoryPie) return [];
    return data.categoryPie.filter(item => !hiddenCategories.has(item.name));
  };

  // Pie chart click handler
  const handlePieClick = async (data, index) => {
    if (!data || !data.payload) return;
    
    const category = data.payload.name;
    console.log('Pie clicked for category:', category, 'with filters:', filters);
    setModalData(prev => ({ ...prev, loading: true, category }));
    setModalOpen(true);
    
    try {
      const params = { ...filters, category, type: 'expense' };
      console.log('Fetching transactions with params:', params);
      const response = await transactionsApi.getAll(params);
      console.log('Response:', response);
      
      // The backend returns { transactions: [...], count, summary, pagination }
      const categoryTransactions = response.data?.transactions || [];
      console.log('Category transactions found:', categoryTransactions.length);
      
      const totalAmount = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      setModalData({
        category,
        transactions: categoryTransactions,
        totalAmount,
        count: categoryTransactions.length,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading category transactions:', error);
      showError('Failed to load transaction details');
      setModalData(prev => ({ ...prev, loading: false }));
    }
  };

  // Export functions
  const exportData = async (format) => {
    try {
      const response = await analyticsApi.exportData({ ...filters, format });
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showSuccess(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export data');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 2, mb: 4, px: 2 }}>
      {/* Page Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Assessment sx={{ mr: 2, verticalAlign: 'middle' }} />
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive data visualization and insights
        </Typography>
      </Box>

      {/* Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center">
              <FilterList sx={{ mr: 1 }} />
              Filter Analytics Data
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={2}>
              <TextField
                fullWidth
                label="From Date"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="medium"
                sx={{ minWidth: 160 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <TextField
                fullWidth
                label="To Date"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="medium"
                sx={{ minWidth: 160 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 200 }}>
                <InputLabel>Account Type</InputLabel>
                <Select
                  value={filters.accountType}
                  label="Account Type"
                  onChange={(e) => handleFilterChange('accountType', e.target.value)}
                >
                  <MenuItem value="">All Account Types</MenuItem>
                  <MenuItem value="bank_account">Bank Account</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                <InputLabel>Account ID</InputLabel>
                <Select
                  value={filters.accountId}
                  label="Account ID"
                  onChange={(e) => handleFilterChange('accountId', e.target.value)}
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
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <LoadingButton
              variant="contained"
              onClick={() => loadAnalytics(filters)}
              startIcon={<FilterList />}
            >
              Apply Filters
            </LoadingButton>
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<Clear />}
            >
              Clear Filters
            </Button>
            <Button
              variant="outlined"
              onClick={() => setQuickDateFilter('last30')}
              startIcon={<CalendarToday />}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outlined"
              onClick={() => setQuickDateFilter('thisYear')}
              startIcon={<CalendarToday />}
            >
              This Year
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Transactions</Typography>
                  <Typography variant="h4">{stats.totalTransactions || 0}</Typography>
                </Box>
                <TableChart sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Total Credits</Typography>
                  <Typography variant="h5">{formatCurrency(stats.totalCredits || 0)}</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ height: '100%', bgcolor: 'error.main', color: 'error.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Total Expenses</Typography>
                  <Typography variant="h5">{formatCurrency(Math.abs(stats.totalExpenses || 0))}</Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'info.main', color: 'info.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Net Balance</Typography>
                  <Typography variant="h5">{formatCurrency(stats.netBalance || 0)}</Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Avg Transaction</Typography>
                  <Typography variant="h5">{formatCurrency(stats.avgTransaction || 0)}</Typography>
                </Box>
                <Insights sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Period Info */}
      {stats.dateRangeStart && stats.dateRangeEnd && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Data Period:</strong> {formatDate(stats.dateRangeStart)} to {formatDate(stats.dateRangeEnd)}
          {(filters.dateFrom || filters.dateTo) && (
            <>
              {' | '}
              <strong>Current Filter:</strong>{' '}
              {filters.dateFrom && `From ${formatDate(filters.dateFrom)}`}
              {filters.dateTo && `${filters.dateFrom ? ' ' : ''}To ${formatDate(filters.dateTo)}`}
            </>
          )}
        </Alert>
      )}

      {/* Charts Section - Row 1: Category Pie Chart and Monthly Trend */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Category Pie Chart */}
        <Grid item xs={12} md={6} sx={{ width:'45%'}}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center">
                    <PieChart sx={{ mr: 1 }} />
                    Expense Categories
                  </Box>
                  {hiddenCategories.size > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setHiddenCategories(new Set())}
                      sx={{ fontSize: '10px', py: 0.5, px: 1 }}
                    >
                      Show All
                    </Button>
                  )}
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 1, m: 0 }}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                {/* Pie Chart Area */}
                <Box sx={{ flex: '0 0 70%', height: '100%' }}>
                  {data.categoryPie && data.categoryPie.length > 0 && getVisiblePieData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getVisiblePieData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
                            // Only show label if percentage is above 3% to avoid overlap
                            if (percent < 0.01) return null;
                            
                            const RADIAN = Math.PI / 180;
                            // Position text inside the pie slice at the center
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            
                            // Calculate font size based on slice size (percentage)
                            const baseFontSize = Math.max(4, Math.min(14, percent * 100 * 0.8));
                            
                            // Calculate rotation angle to align with slice direction
                            let rotationAngle = -midAngle;
                            // Flip text if it would be upside down
                            if (rotationAngle > 90 || rotationAngle < -90) {
                              rotationAngle += 180;
                            }
                            
                            // Truncate name based on slice size
                            const maxLength = Math.max(15, Math.floor(percent * 100 * 0.5));
                            const shortName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
                            
                            return (
                              <g>
                                <text 
                                  x={x} 
                                  y={y} 
                                  fill="white"
                                  textAnchor="middle" 
                                  dominantBaseline="central"
                                  style={{ 
                                    fontSize: `${baseFontSize}px`, 
                                    fontWeight: 'bold',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                                  }}
                                  transform={`rotate(${rotationAngle}, ${x}, ${y})`}
                                >
                                  <tspan x={x} dy="-4">{shortName}</tspan>
                                  <tspan x={x} dy="12">{(percent * 100).toFixed(1)}%</tspan>
                                </text>
                              </g>
                            );
                          }}
                          outerRadius={140}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={handlePieClick}
                          style={{ cursor: 'pointer' }}
                        >
                          {getVisiblePieData().map((entry, index) => {
                            // Find the original index in the full data array for consistent coloring
                            const originalIndex = data.categoryPie.findIndex(item => item.name === entry.name);
                            
                            return (
                              <Cell 
                                key={`cell-${entry.name}`} 
                                fill={COLORS[originalIndex % COLORS.length]}
                                stroke={COLORS[originalIndex % COLORS.length]}
                                strokeWidth={0}
                                style={{
                                  transition: 'all 0.2s ease-in-out',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.filter = 'brightness(1.1)';
                                  e.target.style.strokeWidth = '2';
                                  e.target.style.stroke = '#333';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.filter = 'brightness(1)';
                                  e.target.style.strokeWidth = '0';
                                }}
                              />
                            );
                          })}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => {
                            const visibleTotal = getVisiblePieData().reduce((sum, item) => sum + item.value, 0);
                            const percentage = ((value / visibleTotal) * 100).toFixed(1);
                            return [formatCurrency(value), `${props.payload.name} (${percentage}%)`];
                          }}
                          contentStyle={{ fontSize: '12px' }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : data.categoryPie && data.categoryPie.length > 0 && getVisiblePieData().length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary" textAlign="center">
                        All categories are hidden.<br />Click on categories to show them.
                      </Typography>
                    </Box>
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">No expense data available</Typography>
                    </Box>
                  )}
                </Box>

                {/* Categories List - Scrollable */}
                <Box sx={{ flex: '0 0 30%', height: '100%', pl: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '12px', fontWeight: 'bold' }}>
                    Categories
                  </Typography>
                  <Box
                    sx={{
                      height: 'calc(100% - 24px)',
                      overflowY: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      p: 1
                    }}
                  >
                    {data.categoryPie && data.categoryPie.length > 0 ? (
                      data.categoryPie.map((item, index) => {
                        const isHidden = hiddenCategories.has(item.name);
                        return (
                          <Box
                            key={item.name}
                            onClick={() => handleLegendClick({ value: item.name })}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              cursor: 'pointer',
                              opacity: isHidden ? 0.6 : 1,
                              textDecoration: isHidden ? 'line-through' : 'none',
                              '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.04)'
                              },
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              mb: 0.5
                            }}
                          >
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                backgroundColor: isHidden ? '#ccc' : COLORS[index % COLORS.length],
                                borderRadius: 0.5,
                                flexShrink: 0
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '11px',
                                color: isHidden ? '#ccc' : 'text.primary',
                                lineHeight: 1.2
                              }}
                            >
                              {item.name}
                            </Typography>
                          </Box>
                        );
                      })
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No categories available
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12} md={6} sx={{ width: '45%' }}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <Timeline sx={{ mr: 1 }} />
                  Monthly Expenditure Trend
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 0, m: 0 }}>
              {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary">No trend data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section - Row 2: Income vs Expenses and Category Trend */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Income vs Expenses */}
        <Grid item xs={12} md={6} sx={{ width: '45%' }}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <TrendingUp sx={{ mr: 1 }} />
                  Monthly Income vs Expenses
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 0, m: 0 }}>
              {data.incomeExpense && data.incomeExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.incomeExpense}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(Math.abs(value)), 'Amount']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#00C49F" name="Income" />
                    <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary">No income/expense data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Categories Trend */}
        <Grid item xs={12} md={6} sx={{ width: '45%' }}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <TrendingDown sx={{ mr: 1 }} />
                  Top Categories Trend
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 0, m: 0 }}>
              {data.categoryTrend && data.categoryTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.categoryTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {data.topCategories?.slice(0, 5).map((category, index) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={3}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary">No category trend data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section - Row 3: Day of Week and Bank Analysis */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Day of Week Spending */}
        <Grid item xs={12} md={6} sx={{ width: '45%' }}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <CalendarToday sx={{ mr: 1 }} />
                  Spending by Day of Week
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 0, m: 0 }}>
              {data.dayOfWeek && data.dayOfWeek.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'amount' ? formatCurrency(value) : value,
                        name === 'amount' ? 'Total Spent' : name === 'count' ? 'Transactions' : 'Average'
                      ]}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="amount" fill="#FF6B6B" name="Total Spent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary">No day of week data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bank Analysis */}
        <Grid item xs={12} md={6} sx={{ width: '45%' }}>
          <Card sx={{ height: 500, width: '100%' }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center">
                  <AccountBalance sx={{ mr: 1 }} />
                  Bank-wise Analysis
                </Box>
              }
              sx={{ pb: 0, pt: 1 }}
            />
            <CardContent sx={{ height: 420, p: 0, m: 0 }}>
              {data.bankAnalysis && data.bankAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bankAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bank" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Amount']}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="credits" fill="#4ECDC4" name="Credits" />
                    <Bar dataKey="expenses" fill="#FF6B6B" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="text.secondary">No bank analysis data available</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Section */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center">
              <Download sx={{ mr: 1 }} />
              Export Options
            </Box>
          }
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Export your analytics data and visualizations
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="success"
              startIcon={<FileDownload />}
              onClick={() => exportData('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<FileDownload />}
              onClick={() => exportData('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => window.print()}
            >
              Print Charts
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <PieChart sx={{ mr: 2 }} />
              Category Transactions
            </Box>
            <IconButton onClick={() => setModalOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Category Summary */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <strong>Category:</strong> {modalData.category}
              </Grid>
              <Grid item xs={12} sm={6}>
                <strong>Total Amount:</strong> {formatCurrency(modalData.totalAmount)}
              </Grid>
              <Grid item xs={12} sm={6}>
                <strong>Transaction Count:</strong> {modalData.count}
              </Grid>
              <Grid item xs={12} sm={6}>
                <strong>Average:</strong> {formatCurrency(modalData.count > 0 ? modalData.totalAmount / modalData.count : 0)}
              </Grid>
            </Grid>
          </Alert>

          {modalData.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading transactions...</Typography>
            </Box>
          ) : modalData.transactions.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <Typography color="text.secondary">No transactions found for this category.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Bank</TableCell>
                    <TableCell>Account</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modalData.transactions.slice(0, 100).map((transaction, index) => (
                    <TableRow key={transaction.id || index}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 250, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' 
                          }}
                          title={transaction.description}
                        >
                          {transaction.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(Math.abs(transaction.amount))}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.bank || 'Unknown'} 
                          size="small" 
                          color="secondary" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.accountType} {transaction.accountId ? `(${transaction.accountId})` : ''}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<Download />}
            onClick={() => exportData('csv')}
            disabled={modalData.transactions.length === 0}
          >
            Export These Transactions
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Analytics;