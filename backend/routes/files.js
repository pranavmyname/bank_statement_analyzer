const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { UploadedFile } = require('../models');
const { requireAuth, getCurrentUserId } = require('../middleware/auth');
const { 
    isAllowedFile, 
    extractDataFromFile, 
    categorizeTransactions, 
    isPDFPasswordProtected 
} = require('../utils/fileProcessor');

// Upload file endpoint
router.post('/upload', requireAuth, async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }
        
        const file = req.files.file;
        const { accountType = 'bank_account' } = req.body;
        
        // Validate file type
        if (!isAllowedFile(file.name)) {
            return res.status(400).json({
                error: 'Invalid file type',
                message: 'Only PDF, CSV, XLS, and XLSX files are supported'
            });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(file.name);
        const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(__dirname, '../uploads', filename);
        
        // Ensure uploads directory exists
        await fs.ensureDir(path.join(__dirname, '../uploads'));
        
        // Move uploaded file to uploads directory
        await file.mv(filePath);
        
        // Save file record to database
        const uploadedFile = await UploadedFile.create({
            filename: filename,
            originalFilename: file.name,
            fileType: extension.substring(1).toLowerCase(),
            fileSize: file.size,
            userId: getCurrentUserId(req)
        });
        
        // Store file info in session for processing
        req.session.currentFile = {
            id: uploadedFile.id,
            path: filePath,
            originalName: file.name,
            accountType: accountType
        };
        
        res.json({
            success: true,
            file: uploadedFile,
            message: 'File uploaded successfully. Ready for processing.'
        });
        
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
});

// Process uploaded file
router.post('/process', requireAuth, async (req, res) => {
    try {
        const { password, selectedPages } = req.body;
        
        if (!req.session.currentFile) {
            return res.status(400).json({
                error: 'No file to process',
                message: 'Please upload a file first'
            });
        }
        
        const currentFile = req.session.currentFile;
        const filePath = currentFile.path;
        
        // Check if file exists
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The uploaded file could not be found'
            });
        }
        
        console.log(`Processing file: ${currentFile.originalName}`);
        
        // Extract data from file
        const extractResult = await extractDataFromFile(filePath, password);
        
        if (extractResult.error) {
            if (extractResult.requiresPassword && !password) {
                return res.json({
                    requiresPassword: true,
                    message: 'This PDF is password protected. Please provide the password.'
                });
            }
            
            return res.status(400).json({
                error: 'File processing failed',
                message: extractResult.error,
                requiresPassword: extractResult.requiresPassword
            });
        }
        
        if (!extractResult.data) {
            return res.status(400).json({
                error: 'No data extracted',
                message: 'Could not extract any data from the file'
            });
        }
        
        // For PDF files, check if we need page selection
        const extension = path.extname(currentFile.originalName).toLowerCase();
        if (extension === '.pdf' && !selectedPages) {
            // Return pages for user selection
            const pages = extractResult.data.split('\n\n'); // Split by double newlines as page separators
            if (pages.length > 1) {
                return res.json({
                    requiresPageSelection: true,
                    pages: pages,
                    totalPages: pages.length,
                    message: 'Please select which pages to process'
                });
            }
        }
        
        console.log('Categorizing transactions with OpenAI...');
        
        // Categorize transactions using OpenAI
        const categorizationResult = await categorizeTransactions(
            extractResult.data, 
            "gpt-4o", 
            selectedPages
        );
        
        if (!categorizationResult.success) {
            return res.status(500).json({
                error: 'Transaction categorization failed',
                message: categorizationResult.message,
                details: categorizationResult.error
            });
        }
        
        // Store processed transactions in session for review
        req.session.processedTransactions = {
            transactions: categorizationResult.transactions,
            fileId: currentFile.id,
            accountType: currentFile.accountType,
            totalTokens: categorizationResult.totalTokens
        };
        
        console.log(`Successfully processed ${categorizationResult.transactions.length} transactions`);
        
        res.json({
            success: true,
            transactions: categorizationResult.transactions,
            totalTransactions: categorizationResult.transactions.length,
            fileInfo: {
                name: currentFile.originalName,
                type: extension,
                accountType: currentFile.accountType
            },
            tokensUsed: categorizationResult.totalTokens,
            message: 'File processed successfully. Please review the transactions.'
        });
        
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({
            error: 'Processing failed',
            message: error.message
        });
    }
});

// Check if PDF requires password
router.post('/check-password', requireAuth, async (req, res) => {
    try {
        if (!req.session.currentFile) {
            return res.status(400).json({
                error: 'No file to check',
                message: 'Please upload a file first'
            });
        }
        
        const filePath = req.session.currentFile.path;
        const extension = path.extname(req.session.currentFile.originalName).toLowerCase();
        
        if (extension !== '.pdf') {
            return res.json({
                requiresPassword: false
            });
        }
        
        const requiresPassword = await isPDFPasswordProtected(filePath);
        
        res.json({
            requiresPassword
        });
        
    } catch (error) {
        console.error('Password check error:', error);
        res.status(500).json({
            error: 'Password check failed',
            message: error.message
        });
    }
});

// Get recent uploaded files
router.get('/recent', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const limit = parseInt(req.query.limit) || 10;
        
        const recentFiles = await UploadedFile.findAll({
            where: { userId },
            order: [['uploadedAt', 'DESC']],
            limit
        });
        
        res.json({
            files: recentFiles
        });
        
    } catch (error) {
        console.error('Error fetching recent files:', error);
        res.status(500).json({
            error: 'Failed to fetch files',
            message: error.message
        });
    }
});

// Delete uploaded file
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        
        const file = await UploadedFile.findOne({
            where: { 
                id,
                userId // Ensure user can only delete their own files
            }
        });
        
        if (!file) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The specified file does not exist or you do not have access to it'
            });
        }
        
        // Delete physical file
        const filePath = path.join(__dirname, '../uploads', file.filename);
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
        
        // Delete database record
        await file.destroy();
        
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            error: 'Failed to delete file',
            message: error.message
        });
    }
});

module.exports = router;
