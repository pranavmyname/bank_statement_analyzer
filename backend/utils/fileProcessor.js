const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { DEFAULT_CATEGORIES } = require('./initialize');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_CONTENT = `You are a financial analyst specialized in categorizing bank transactions.
You will receive bank statement text and need to extract all transactions.
For each transaction, determine if it's a credit or expense.

Categorize each expense into one of these categories:
${DEFAULT_CATEGORIES.map(category => `- ${category}`).join('\n')}

IMPORTANT: Keep all dates in DD/MM/YYYY format (Indian format).
Your response must be valid, parsable JSON only with no markdown formatting.
Make sure your response can be parsed by JavaScript's JSON.parse() function.`;

/**
 * Check if a file type is allowed
 */
const isAllowedFile = (filename) => {
    const allowedExtensions = ['pdf', 'csv', 'xls', 'xlsx'];
    const extension = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(extension);
};

/**
 * Extract data from different file types
 */
const extractDataFromFile = async (filePath, password = null) => {
    const filename = path.basename(filePath);
    const extension = filename.split('.').pop().toLowerCase();
    
    try {
        switch (extension) {
            case 'pdf':
                return await extractTextFromPDF(filePath, password);
            case 'csv':
                return await extractDataFromCSV(filePath);
            case 'xls':
            case 'xlsx':
                return await extractDataFromExcel(filePath);
            default:
                return { data: null, error: 'unsupported_format', requiresPassword: false };
        }
    } catch (error) {
        console.error('Error extracting data from file:', error);
        return { data: null, error: error.message, requiresPassword: false };
    }
};

/**
 * Extract text from PDF file
 */
const extractTextFromPDF = async (pdfPath, password = null) => {
    try {
        const dataBuffer = await fs.readFile(pdfPath);
        const options = {
            max: 4 // Limit to first 4 pages like the Python version
        };
        
        if (password) {
            options.password = password;
        }
        
        const data = await pdfParse(dataBuffer, options);
        
        if (!data.text || data.text.trim().length === 0) {
            return { data: null, error: 'empty_pdf', requiresPassword: false };
        }
        
        return { data: data.text, error: null, requiresPassword: false };
        
    } catch (error) {
        console.error('PDF parsing error:', error);
        
        // Check if it's a password-protected PDF
        if (error.message.includes('password') || error.message.includes('encrypted')) {
            return { data: null, error: 'password_required', requiresPassword: true };
        }
        
        return { data: null, error: 'pdf_parsing_failed', requiresPassword: false };
    }
};

/**
 * Extract data from CSV file
 */
const extractDataFromCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const transactions = [];
        let headers = [];
        let rowCount = 0;
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headerRow) => {
                headers = headerRow;
            })
            .on('data', (row) => {
                if (rowCount === 0) {
                    // Try to identify common column patterns
                    const dateCols = headers.filter(col => col.toLowerCase().includes('date'));
                    const descCols = headers.filter(col => 
                        ['desc', 'detail', 'narrative', 'transaction'].some(keyword => 
                            col.toLowerCase().includes(keyword)
                        )
                    );
                    const amountCols = headers.filter(col => 
                        ['amount', 'value', 'debit', 'credit'].some(keyword => 
                            col.toLowerCase().includes(keyword)
                        )
                    );
                    
                    if (dateCols.length === 0 || descCols.length === 0 || amountCols.length === 0) {
                        return reject(new Error('invalid_csv_format'));
                    }
                }
                
                transactions.push(row);
                rowCount++;
            })
            .on('end', () => {
                if (transactions.length === 0) {
                    resolve({ data: null, error: 'empty_csv', requiresPassword: false });
                } else {
                    // Convert to text format for AI processing
                    const csvText = transactions.map(row => 
                        Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
                    ).join('\n');
                    
                    resolve({ data: csvText, error: null, requiresPassword: false });
                }
            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

/**
 * Extract data from Excel file
 */
const extractDataFromExcel = async (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        
        if (!sheetName) {
            return { data: null, error: 'no_sheets_found', requiresPassword: false };
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            return { data: null, error: 'empty_excel', requiresPassword: false };
        }
        
        // Try to identify common column patterns
        const firstRow = jsonData[0];
        const headers = Object.keys(firstRow);
        
        const dateCols = headers.filter(col => col.toLowerCase().includes('date'));
        const descCols = headers.filter(col => 
            ['desc', 'detail', 'narrative', 'transaction'].some(keyword => 
                col.toLowerCase().includes(keyword)
            )
        );
        const amountCols = headers.filter(col => 
            ['amount', 'value', 'debit', 'credit'].some(keyword => 
                col.toLowerCase().includes(keyword)
            )
        );
        
        if (dateCols.length === 0 || descCols.length === 0 || amountCols.length === 0) {
            return { data: null, error: 'invalid_excel_format', requiresPassword: false };
        }
        
        // Convert to text format for AI processing
        const excelText = jsonData.map(row => 
            Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
        ).join('\n');
        
        return { data: excelText, error: null, requiresPassword: false };
        
    } catch (error) {
        console.error('Excel parsing error:', error);
        return { data: null, error: 'excel_parsing_failed', requiresPassword: false };
    }
};

/**
 * Categorize transactions using OpenAI
 */
const categorizeTransactions = async (textOrPages, model = "gpt-4o", selectedPages = null) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }
        
        let textToProcess = textOrPages;
        if (selectedPages && Array.isArray(textOrPages)) {
            // If pages are provided and specific pages are selected
            textToProcess = selectedPages.map(pageNum => 
                textOrPages[pageNum - 1] || ''
            ).join('\n\n');
        }
        
        console.log('Sending transaction data to OpenAI for categorization...');
        
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: SYSTEM_CONTENT
                },
                {
                    role: "user", 
                    content: `Please analyze this bank statement text and extract all transactions as JSON:\n\n${textToProcess}`
                }
            ],
            temperature: 0.1
        });
        
        const responseText = completion.choices[0].message.content.trim();
        console.log('OpenAI response received');
        
        // Try to parse the JSON response
        try {
            const transactions = JSON.parse(responseText);
            
            // Validate the response structure
            if (!Array.isArray(transactions)) {
                throw new Error('Response is not an array of transactions');
            }
            
            // Sort transactions by date
            const sortedTransactions = transactions.sort((a, b) => {
                const dateA = parseDate(a.date);
                const dateB = parseDate(b.date);
                return dateA - dateB;
            });
            
            return { 
                success: true, 
                transactions: sortedTransactions,
                totalTokens: completion.usage.total_tokens
            };
            
        } catch (parseError) {
            console.error('Failed to parse OpenAI response as JSON:', parseError);
            console.log('Raw response:', responseText);
            
            return {
                success: false,
                error: 'invalid_json_response',
                message: 'OpenAI returned invalid JSON format',
                rawResponse: responseText
            };
        }
        
    } catch (error) {
        console.error('OpenAI categorization error:', error);
        
        if (error.code === 'insufficient_quota') {
            return {
                success: false,
                error: 'openai_quota_exceeded',
                message: 'OpenAI API quota exceeded. Please check your usage limits.'
            };
        } else if (error.code === 'invalid_api_key') {
            return {
                success: false,
                error: 'openai_invalid_key',
                message: 'Invalid OpenAI API key. Please check your configuration.'
            };
        }
        
        return {
            success: false,
            error: 'openai_processing_failed',
            message: error.message
        };
    }
};

/**
 * Parse date string in DD/MM/YYYY format
 */
const parseDate = (dateString) => {
    try {
        if (!dateString) return new Date(0);
        
        // Handle DD/MM/YYYY format
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        
        // Fallback to regular date parsing
        return new Date(dateString);
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return new Date(0);
    }
};

/**
 * Check if PDF is password protected
 */
const isPDFPasswordProtected = async (pdfPath) => {
    try {
        const dataBuffer = await fs.readFile(pdfPath);
        await pdfParse(dataBuffer, { max: 1 });
        return false;
    } catch (error) {
        return error.message.includes('password') || error.message.includes('encrypted');
    }
};

module.exports = {
    isAllowedFile,
    extractDataFromFile,
    extractTextFromPDF,
    extractDataFromCSV,
    extractDataFromExcel,
    categorizeTransactions,
    isPDFPasswordProtected,
    parseDate
};
