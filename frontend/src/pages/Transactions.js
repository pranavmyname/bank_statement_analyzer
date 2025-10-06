import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Tooltip,
  Stack,
  InputAdornment,
  CircularProgress,
  TableSortLabel,
} from '@mui/material';
import {
  Edit,
  Delete,
  Search,
  FilterList,
  FileDownload,
  DeleteSweep,
  Add,
  TrendingUp,
  TrendingDown,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { transactionsApi, categoriesApi, analyticsApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Transactions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError, showInfo } = useNotification();

  // State management
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 0);
  const [rowsPerPage, setRowsPerPage] = useState(parseInt(searchParams.get('limit')) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accountIds, setAccountIds] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
    accountType: searchParams.get('accountType') || '',
    accountId: searchParams.get('accountId') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, transaction: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, transaction: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(null); // Track which transaction's category is being updated
  
  // Sorting state
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // Default to newest first

  useEffect(() => {
    loadTransactions();
    loadCategories();
    loadAccountIds();
  }, [page, rowsPerPage, filters, sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        sortBy,
        sortOrder,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] == null) {
          delete params[key];
        }
      });

      const response = await transactionsApi.getAll(params);
      setTransactions(response.data.transactions);
      setTotalCount(response.data.pagination.totalCount);
      setSummary(response.data.summary);
      
      // Update URL params
      updateUrlParams(params);
    } catch (error) {
      showError('Failed to load transactions');
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Load account IDs
  const loadAccountIds = async () => {
    try {
      const response = await analyticsApi.getAccountIds();
      setAccountIds(response.data?.accountIds || []);
    } catch (error) {
      console.error('Error loading account IDs:', error);
      setAccountIds([]);
    }
  };

  const updateUrlParams = (params) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '') {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category: '',
      accountType: '',
      startDate: '',
      endDate: '',
    });
    setPage(0);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedTransactions(transactions.map(t => t.id));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectTransaction = (transactionId) => {
    setSelectedTransactions(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const handleEditTransaction = async (transactionData) => {
    try {
      await transactionsApi.update(editDialog.transaction.id, transactionData);
      showSuccess('Transaction updated successfully');
      setEditDialog({ open: false, transaction: null });
      loadTransactions();
    } catch (error) {
      showError('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async () => {
    try {
      await transactionsApi.delete(deleteDialog.transaction.id);
      showSuccess('Transaction deleted successfully');
      setDeleteDialog({ open: false, transaction: null });
      loadTransactions();
    } catch (error) {
      showError('Failed to delete transaction');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await transactionsApi.bulkDelete(selectedTransactions);
      showSuccess(`${selectedTransactions.length} transactions deleted successfully`);
      setBulkDeleteDialog(false);
      setSelectedTransactions([]);
      loadTransactions();
    } catch (error) {
      showError('Failed to delete transactions');
    }
  };

  // Handle inline category update
  const handleCategoryChange = async (transactionId, newCategory) => {
    setUpdatingCategory(transactionId);
    try {
      // Update the transaction with new category
      await transactionsApi.update(transactionId, { category: newCategory });
      showSuccess('Category updated successfully');
      loadTransactions(); // Refresh the transactions list
    } catch (error) {
      console.error('Error updating category:', error);
      showError('Failed to update category');
    } finally {
      setUpdatingCategory(null);
    }
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to desc for date, asc for others
      setSortBy(column);
      setSortOrder(column === 'date' ? 'desc' : 'asc');
    }
  };

  const handleExport = async () => {
    try {
      const response = await transactionsApi.export({
        format: 'csv',
        filters: filters
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Transactions exported successfully');
    } catch (error) {
      showError('Failed to export transactions');
    }
  };

  const getTypeColor = (type) => {
    return type === 'credit' ? 'success' : 'error';
  };

  const getAccountTypeLabel = (accountType) => {
    return accountType === 'bank_account' ? 'Bank' : 'Credit Card';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Transactions
            </Typography>
            {summary && (
              <Typography variant="body2" color="text.secondary">
                {summary.totalTransactions.toLocaleString()} transactions • 
                Income: {formatCurrency(summary.totalCredits)} • 
                Expenses: {formatCurrency(summary.totalExpenses)} • 
                Net: {formatCurrency(summary.netBalance)}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={2}>
            <LoadingButton
              variant="outlined"
              startIcon={<Refresh />}
              loading={loading}
              onClick={loadTransactions}
            >
              Refresh
            </LoadingButton>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Stack>
        </Box>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {summary.totalTransactions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(summary.totalCredits)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Credits
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {formatCurrency(summary.totalExpenses)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Expenses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="h4" 
                    color={summary.netBalance >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(summary.netBalance)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Net Balance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        {showFilters && (
          <Card sx={{ mb: 4 }}>
            <CardHeader 
              title="Filter Transactions" 
              action={
                <Button onClick={clearFilters} size="small">
                  Clear All
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} lg={4}>
                  <TextField
                    fullWidth
                    label="Search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search description..."
                    size="medium"
                    sx={{ minWidth: 250 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} lg={2}>
                  <FormControl fullWidth size="medium" sx={{ minWidth: 140 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="credit">Credit</MenuItem>
                      <MenuItem value="expense">Expense</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      label="Category"
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
                        <MenuItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} lg={3}>
                  <FormControl fullWidth size="medium" sx={{ minWidth: 180 }}>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      value={filters.accountType}
                      onChange={(e) => handleFilterChange('accountType', e.target.value)}
                      label="Account Type"
                    >
                      <MenuItem value="">All Accounts</MenuItem>
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
                      onChange={(e) => handleFilterChange('accountId', e.target.value)}
                      label="Account ID"
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
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate ? new Date(filters.startDate) : null}
                    onChange={(date) => handleFilterChange('startDate', date ? date.toISOString().split('T')[0] : '')}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate ? new Date(filters.endDate) : null}
                    onChange={(date) => handleFilterChange('endDate', date ? date.toISOString().split('T')[0] : '')}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedTransactions.length > 0 && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setBulkDeleteDialog(true)}
                startIcon={<DeleteSweep />}
              >
                Delete Selected ({selectedTransactions.length})
              </Button>
            }
          >
            {selectedTransactions.length} transaction(s) selected
          </Alert>
        )}

        {/* Transactions Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedTransactions.length > 0 && selectedTransactions.length < transactions.length}
                      checked={transactions.length > 0 && selectedTransactions.length === transactions.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'date' ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === 'date'}
                      direction={sortBy === 'date' ? sortOrder : 'asc'}
                      onClick={() => handleSort('date')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'description' ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === 'description'}
                      direction={sortBy === 'description' ? sortOrder : 'asc'}
                      onClick={() => handleSort('description')}
                    >
                      Description
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'amount' ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === 'amount'}
                      direction={sortBy === 'amount' ? sortOrder : 'asc'}
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'type' ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === 'type'}
                      direction={sortBy === 'type' ? sortOrder : 'asc'}
                      onClick={() => handleSort('type')}
                    >
                      Type
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell sortDirection={sortBy === 'accountType' ? sortOrder : false}>
                    <TableSortLabel
                      active={sortBy === 'accountType'}
                      direction={sortBy === 'accountType' ? sortOrder : 'asc'}
                      onClick={() => handleSort('accountType')}
                    >
                      Account
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(transaction.date)}
                        </Typography>
                        {transaction.time && (
                          <Typography variant="caption" color="text.secondary">
                            {transaction.time}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300 }}>
                          {transaction.description}
                        </Typography>
                        {transaction.bank && (
                          <Chip 
                            label={transaction.bank} 
                            size="small" 
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="h6" 
                          color={getTypeColor(transaction.type)}
                          fontWeight="bold"
                        >
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          color={getTypeColor(transaction.type)}
                          size="small"
                          icon={transaction.type === 'credit' ? <TrendingUp /> : <TrendingDown />}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={transaction.category || ''}
                            onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                            disabled={updatingCategory === transaction.id}
                            displayEmpty
                            size="small"
                            sx={{
                              '& .MuiSelect-select': {
                                py: 0.5,
                                fontSize: '0.875rem',
                              },
                            }}
                            endAdornment={
                              updatingCategory === transaction.id && (
                                <CircularProgress size={16} sx={{ mr: 1 }} />
                              )
                            }
                          >
                            <MenuItem value="">
                              <em>No Category</em>
                            </MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getAccountTypeLabel(transaction.accountType)} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => setEditDialog({ open: true, transaction })}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog({ open: true, transaction })}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 8 }}>
                      {loading ? (
                        <Typography>Loading transactions...</Typography>
                      ) : (
                        <Box>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            No transactions found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Upload some bank statements to get started
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Card>

        {/* Edit Transaction Dialog */}
        <EditTransactionDialog
          open={editDialog.open}
          transaction={editDialog.transaction}
          categories={categories}
          onClose={() => setEditDialog({ open: false, transaction: null })}
          onSave={handleEditTransaction}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, transaction: null })}>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, transaction: null })}>
              Cancel
            </Button>
            <Button onClick={handleDeleteTransaction} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteDialog} onClose={() => setBulkDeleteDialog(false)}>
          <DialogTitle>Delete {selectedTransactions.length} Transactions</DialogTitle>
          <DialogContent>
            Are you sure you want to delete {selectedTransactions.length} selected transactions? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkDelete} color="error" variant="contained">
              Delete All
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

// Edit Transaction Dialog Component
const EditTransactionDialog = ({ open, transaction, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: '',
    time: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount || '',
        type: transaction.type || 'expense',
        category: transaction.category || '',
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
        time: transaction.time || ''
      });
    }
  }, [transaction]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  label="Type"
                >
                  <MenuItem value="credit">Credit</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time (Optional)"
                placeholder="HH:MM"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  label="Category"
                >
                  <MenuItem value="">No Category</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={saving}
          >
            Save Changes
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Transactions;