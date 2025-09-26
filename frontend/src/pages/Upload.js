import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  PictureAsPdf,
  TableChart,
  ExpandMore,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { filesApi } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { getFileExtension, isFileTypeSupported, formatFileSize } from '../utils/helpers';
import LoadingButton from '../components/LoadingButton';

const Upload = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useNotification();

  const [file, setFile] = useState(null);
  const [accountType, setAccountType] = useState('bank_account');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setUploadError('');
      
      // Validate file type
      if (!isFileTypeSupported(selectedFile.name)) {
        setUploadError('Unsupported file type. Please select a PDF, CSV, XLS, or XLSX file.');
        setFile(null);
        return;
      }

      // Validate file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setUploadError('File size too large. Please select a file smaller than 50MB.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountType', accountType);

      const response = await filesApi.upload(formData);
      
      if (response.data.success) {
        showSuccess(response.data.message);
        
        // Check if PDF requires password
        const extension = getFileExtension(file.name);
        if (extension === 'pdf') {
          const passwordCheck = await filesApi.checkPassword();
          if (passwordCheck.data.requiresPassword) {
            navigate('/select-pages?requiresPassword=true');
            return;
          }
        }
        
        // Redirect to processing
        navigate('/select-pages');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed. Please try again.';
      setUploadError(message);
      showError(message);
    } finally {
      setUploading(false);
    }
  };

  const uploadSteps = [
    { step: 1, title: 'Upload', description: 'Select and upload your file' },
    { step: 2, title: 'Process', description: 'Extract transaction data' },
    { step: 3, title: 'Review', description: 'Edit categories & details' },
    { step: 4, title: 'Save', description: 'Commit to database' },
  ];

  const supportedFormats = [
    {
      icon: <PictureAsPdf color="error" />,
      title: 'PDF Files',
      description: 'Bank statements in PDF format',
      features: [
        'Password-protected PDFs supported',
        'AI-powered transaction extraction',
        'Limited to first 4 pages for processing',
      ],
    },
    {
      icon: <TableChart color="success" />,
      title: 'CSV/Excel Files',
      description: 'Transaction exports from banks',
      features: [
        'Should contain Date, Description, Amount columns',
        'Automatic column detection',
        'Faster processing than PDFs',
      ],
    },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Upload Financial Statement
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload your bank statement or transaction file to analyze expenses and credits
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={8}>
          {/* Upload Form */}
          <Card>
            <CardHeader 
              title="Upload File" 
              avatar={<CloudUpload color="primary" />}
            />
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                {/* Account Type Selection */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    label="Account Type"
                  >
                    <MenuItem value="bank_account">Bank Account</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                  </Select>
                </FormControl>

                {/* File Upload */}
                <Box sx={{ mb: 3 }}>
                  <input
                    type="file"
                    accept=".pdf,.csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      sx={{ height: 60, mb: 2 }}
                      startIcon={<CloudUpload />}
                    >
                      Choose File
                    </Button>
                  </label>
                  
                  {file && (
                    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getFileExtension(file.name) === 'pdf' ? (
                          <PictureAsPdf color="error" />
                        ) : (
                          <TableChart color="success" />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {file.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Size: {formatFileSize(file.size)} • Type: {getFileExtension(file.name).toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  )}
                </Box>

                {/* Error Display */}
                {uploadError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {uploadError}
                  </Alert>
                )}

                {/* Submit Button */}
                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  loading={uploading}
                  disabled={!file}
                  startIcon={<CloudUpload />}
                >
                  Upload & Process File
                </LoadingButton>
              </Box>
            </CardContent>
          </Card>

          {/* Upload Process Steps */}
          <Card sx={{ mt: 4 }}>
            <CardHeader title="Upload Process" />
            <CardContent>
              <Grid container spacing={2}>
                {uploadSteps.map((step) => (
                  <Grid item xs={12} sm={6} md={3} key={step.step}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          fontWeight: 'bold',
                          fontSize: 20,
                        }}
                      >
                        {step.step}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Automatic Categorization Info */}
          <Alert severity="info" sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
              Automatic Categorization
            </Typography>
            <Typography variant="body2">
              Your transactions will be automatically categorized into: Transportation, Flights, Stays, 
              Home Rent & Utilities, Furniture, Electronics, Groceries, Health, 
              Money sent to family, Investments, Entertainment, Shopping, Petrol,
              Credit Card Payment, Loan repayment, and Other.
              <br /><br />
              You can review and modify categories before saving to database.
            </Typography>
          </Alert>
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Supported Formats */}
          <Card>
            <CardHeader title="Supported Formats & Requirements" />
            <CardContent>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>File Format Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {supportedFormats.map((format, index) => (
                    <Box key={index} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {format.icon}
                        <Typography variant="h6">{format.title}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {format.description}
                      </Typography>
                      <List dense>
                        {format.features.map((feature, featureIndex) => (
                          <ListItem key={featureIndex} sx={{ py: 0 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckCircle color="success" sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2">{feature}</Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Upload;
