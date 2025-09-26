import React, { useState, useEffect } from 'react';
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
  Paper,
  Chip,
  Button,
  Alert,
  Grid,
  Checkbox,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  FileCopy,
  Delete,
  Warning,
  CheckCircle,
  Compare,
  DeleteSweep,
  Refresh,
} from '@mui/icons-material';
import { transactionsApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Duplicates = () => {
  const { showSuccess, showError, showInfo } = useNotification();

  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, transactionIds: [] });

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      const response = await transactionsApi.getDuplicates();
      setDuplicateGroups(response.data.duplicateGroups || []);
      
      if (response.data.duplicateGroups.length === 0) {
        showInfo('No duplicate transactions found');
      }
    } catch (error) {
      showError('Failed to load duplicate transactions');
      console.error('Error loading duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectForDeletion = (transactionId) => {
    setSelectedForDeletion(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selectedForDeletion.length === 0) {
      showError('Please select transactions to delete');
      return;
    }
    
    setDeleteDialog({
      open: true,
      transactionIds: selectedForDeletion
    });
  };

  const confirmDelete = async () => {
    try {
      await transactionsApi.bulkDelete(deleteDialog.transactionIds);
      showSuccess(`${deleteDialog.transactionIds.length} transactions deleted successfully`);
      
      // Remove deleted transactions from state
      setDuplicateGroups(prev => 
        prev.map(group => ({
          ...group,
          transactions: group.transactions.filter(
            t => !deleteDialog.transactionIds.includes(t.id)
          )
        })).filter(group => group.transactions.length > 1) // Keep only groups with more than 1 transaction
      );
      
      setSelectedForDeletion([]);
      setDeleteDialog({ open: false, transactionIds: [] });
    } catch (error) {
      showError('Failed to delete transactions');
    }
  };

  const handleSelectAllInGroup = (group) => {
    const transactionIds = group.transactions.map(t => t.id);
    const allSelected = transactionIds.every(id => selectedForDeletion.includes(id));
    
    if (allSelected) {
      // Deselect all in this group
      setSelectedForDeletion(prev => prev.filter(id => !transactionIds.includes(id)));
    } else {
      // Select all in this group (except the first one to keep one copy)
      const toSelect = transactionIds.slice(1); // Keep the first one
      setSelectedForDeletion(prev => [...new Set([...prev, ...toSelect])]);
    }
  };

  const getTypeColor = (type) => {
    return type === 'credit' ? 'success' : 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <LoadingButton loading variant="outlined">
          Searching for duplicates...
        </LoadingButton>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Find Duplicate Transactions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {duplicateGroups.length > 0 
              ? `Found ${duplicateGroups.length} potential duplicate groups`
              : 'No duplicate transactions found'
            }
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <LoadingButton
            variant="outlined"
            startIcon={<Refresh />}
            loading={loading}
            onClick={loadDuplicates}
          >
            Refresh
          </LoadingButton>
          {selectedForDeletion.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedForDeletion.length})
            </Button>
          )}
        </Stack>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>How it works:</strong> We find potential duplicates by comparing transactions with the same date, amount, and similar descriptions. 
          Review each group carefully and select the transactions you want to delete, keeping one copy of each unique transaction.
        </Typography>
      </Alert>

      {duplicateGroups.length > 0 ? (
        <Grid container spacing={3}>
          {duplicateGroups.map((group, groupIndex) => (
            <Grid item xs={12} key={groupIndex}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FileCopy color="warning" />
                      <Typography variant="h6">
                        Duplicate Group {groupIndex + 1}
                      </Typography>
                      <Chip 
                        label={`${group.transactions.length} transactions`} 
                        color="warning" 
                        size="small" 
                      />
                    </Box>
                  }
                  action={
                    <Button
                      size="small"
                      onClick={() => handleSelectAllInGroup(group)}
                      startIcon={<CheckCircle />}
                    >
                      Auto-select duplicates
                    </Button>
                  }
                />
                <CardContent>
                  {/* Group Summary */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Date</Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatDate(group.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Amount</Typography>
                        <Typography variant="h6" color={getTypeColor(group.type)}>
                          {formatCurrency(group.amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Type</Typography>
                        <Chip 
                          label={group.type} 
                          color={getTypeColor(group.type)} 
                          size="small" 
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body2" color="text.secondary">Category</Typography>
                        <Typography variant="body1">
                          {group.category || 'No category'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Transaction Comparisons */}
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Select to Delete</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.transactions.map((transaction, index) => (
                          <TableRow 
                            key={transaction.id}
                            selected={selectedForDeletion.includes(transaction.id)}
                            sx={{
                              bgcolor: index === 0 ? 'success.light' : 'inherit',
                              opacity: selectedForDeletion.includes(transaction.id) ? 0.7 : 1
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedForDeletion.includes(transaction.id)}
                                onChange={() => handleSelectForDeletion(transaction.id)}
                                disabled={index === 0} // Prevent deleting the first one
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {transaction.description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(transaction.createdAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                File upload
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {index === 0 ? (
                                <Chip 
                                  label="Keep (Original)" 
                                  color="success" 
                                  size="small"
                                  icon={<CheckCircle />}
                                />
                              ) : selectedForDeletion.includes(transaction.id) ? (
                                <Chip 
                                  label="Will be deleted" 
                                  color="error" 
                                  size="small"
                                  icon={<Delete />}
                                />
                              ) : (
                                <Chip 
                                  label="Potential duplicate" 
                                  color="warning" 
                                  size="small"
                                  icon={<Warning />}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Duplicates Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Great! Your transaction data appears to be clean with no duplicate entries detected.
            </Typography>
            <Button
              variant="outlined"
              onClick={loadDuplicates}
              startIcon={<Refresh />}
            >
              Check Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, transactionIds: [] })}>
        <DialogTitle sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, verticalAlign: 'middle' }} />
          Delete {deleteDialog.transactionIds.length} Transactions
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete {deleteDialog.transactionIds.length} selected transactions? 
            This will permanently remove them from your database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, transactionIds: [] })}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete Transactions
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Duplicates;