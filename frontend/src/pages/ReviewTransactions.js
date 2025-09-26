import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import { Save, Edit } from '@mui/icons-material';
import { transactionsApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { formatCurrency, formatDate } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const ReviewTransactions = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [transactions, setTransactions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Mock data for now - in real app, this would come from session/API
  React.useEffect(() => {
    // This would normally fetch processed transactions from the session
    setTransactions([
      {
        id: 1,
        date: '2023-12-01',
        description: 'Amazon Purchase',
        amount: 2500.00,
        type: 'expense',
        category: 'Shopping'
      },
      {
        id: 2,
        date: '2023-12-02',
        description: 'Salary Credit',
        amount: 75000.00,
        type: 'credit',
        category: null
      }
    ]);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await transactionsApi.save(transactions);
      showSuccess('Transactions saved successfully!');
      navigate('/transactions');
    } catch (error) {
      showError('Failed to save transactions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Review Transactions
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Review the extracted transactions below. You can edit categories and details before saving to the database.
      </Alert>

      <Card>
        <CardHeader 
          title={`Review ${transactions.length} Transactions`}
          action={
            <LoadingButton
              variant="contained"
              loading={saving}
              onClick={handleSave}
              startIcon={<Save />}
              disabled={transactions.length === 0}
            >
              Save Transactions
            </LoadingButton>
          }
        />
        <CardContent>
          {transactions.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          color={transaction.type === 'credit' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {transaction.category && (
                          <Chip label={transaction.category} size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<Edit />}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No transactions to review
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReviewTransactions;
