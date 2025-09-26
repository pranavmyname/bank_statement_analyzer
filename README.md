# Expense Tracker - Modern React + Node.js Application

A comprehensive financial statement analysis application converted from Python Flask to **React frontend with Material UI** and **Node.js backend**.

> **NEW**: Beautiful Material UI design with fully functional pages, rich analytics, and modern user experience!

## **Key Features**

### **Core Functionality**
- **File Upload & Processing**: Upload PDF, CSV, Excel bank statements
- **AI-Powered Categorization**: Automatic transaction categorization using OpenAI GPT-4
- **Multi-User Support**: Manage multiple users with separate transaction data
- **Rich Analytics & Insights**: Interactive charts, trends, and spending insights
- **Smart Duplicate Detection**: Identify and remove duplicate transactions
- **Data Export**: Export transactions in various formats
- **Database Management**: Complete database administration tools

### **Beautiful User Interface**
- **Modern Material Design**: Professional UI with Material UI components
- **Fully Responsive**: Perfect experience on desktop, tablet, and mobile
- **Interactive Charts**: Line charts, pie charts, bar charts with drill-down capability
- **Smart Filtering**: Advanced filtering by date, category, amount, type
- **Real-time Updates**: Live notifications and instant feedback
- **Professional Theme**: Carefully crafted color scheme and typography

## **Technology Stack**

### **Backend (Node.js)**
- **Express.js** - Fast web framework
- **Sequelize ORM** - PostgreSQL/SQLite support
- **OpenAI GPT-4** - Transaction categorization
- **Multer** - File upload handling
- **PDF/Excel Processing** - pdf-parse, xlsx, csv-parser
- **Session Authentication** - Secure session management

### **Frontend (React)**
- **React 18** - Modern React with hooks
- **Material UI (MUI)** - Google's Material Design
- **React Router** - Client-side routing
- **Recharts** - Beautiful, responsive charts
- **Axios** - API communication
- **Date-fns** - Date manipulation

## **Quick Start**

### **Prerequisites**
- Node.js 16+ 
- PostgreSQL (optional, SQLite works for development)
- OpenAI API key

### **1. Backend Setup**
```bash
cd backend
npm install
cp config.example.txt .env
# Edit .env file with your API keys (see configuration below)
npm run dev
```

### **2. Frontend Setup**
```bash
cd frontend
npm install
npm start
```

### **3. Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Login**: Use your `MAGIC_TOKEN` from .env file

## **Configuration**

Edit `backend/.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Session Configuration
SESSION_SECRET=your_secure_session_secret_here

# Database Configuration
# PostgreSQL (recommended for production)
DB_URL=postgresql://username:password@localhost:5432/expense_tracker
# SQLite (development) - leave DB_URL empty for SQLite

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

# Authentication Tokens (REQUIRED)
MAGIC_TOKEN=your_access_token_here
UPLOAD_TOKEN=your_upload_token_here
```

## **Application Pages**

### **Dashboard**
- **Summary Cards**: Total transactions, income, expenses, net balance
- **Recent Uploads**: File processing status and history  
- **Category Breakdown**: Top spending categories with percentages
- **Quick Actions**: Direct access to all major features
- **Smart Filters**: Filter by year, month, account type

### **Analytics** 
- **Monthly Trends**: Income vs expenses over time with line charts
- **Category Distribution**: Interactive pie charts with drill-down
- **Period Comparisons**: Current vs previous period analysis
- **Smart Insights**: AI-powered spending pattern insights
- **Account Analysis**: Bank account vs credit card spending
- **Top Transactions**: Largest expenses and income

### **Transactions**
- **Complete Transaction List**: Paginated, searchable table
- **Advanced Filtering**: Date range, category, type, amount, description
- **Inline Editing**: Edit transaction details with modal forms
- **Bulk Operations**: Select and delete multiple transactions
- **Export**: Download filtered data as CSV
- **Live Summary**: Real-time statistics at the top

### **Upload**
- **Drag & Drop**: Beautiful file upload interface
- **Multi-Format Support**: PDF, CSV, Excel files
- **Password Support**: Handle password-protected PDFs
- **AI Processing**: Automatic transaction extraction and categorization
- **Review System**: Edit transactions before saving to database

### **Find Duplicates**
- **Smart Detection**: Find duplicates by date, amount, description similarity
- **Side-by-Side Comparison**: Visual comparison of potential duplicates
- **Auto-Selection**: One-click to select duplicates while preserving originals
- **Bulk Removal**: Safe deletion of multiple duplicates
- **Safety Features**: Always keeps at least one copy

### **Settings**
- **User Management**: Add, edit, delete, switch between users
- **Category Management**: Create custom categories, edit existing ones
- **Database Tools**: Backup, statistics, connection status, optimization
- **Usage Statistics**: Real-time counts and analytics
- **System Administration**: Database reinitialization and maintenance

## **Supported File Formats**

### **PDF Files**
- Bank statements in PDF format
- Password-protected PDFs supported
- AI-powered transaction extraction
- Processes first 4 pages automatically
- Page selection for large documents

### **CSV/Excel Files**
- Transaction exports from banks (CSV, XLS, XLSX)
- Automatic column detection (Date, Description, Amount)
- Handles various date formats
- Faster processing than PDFs
- Supports large datasets

## **Default Categories**

The system includes these predefined expense categories:
- Transportation, Flights, Stays
- Home Rent & Utilities, Furniture, Electronics  
- Groceries, Health, Outside Food
- Money sent to family, Investments
- Entertainment, Shopping, Petrol
- Credit Card Payment, Loan repayment
- Other (for miscellaneous expenses)

## **API Endpoints**

### **Authentication**
- `POST /api/auth/verify-token` - Verify access token
- `GET /api/auth/status` - Check authentication status

### **Users**
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `POST /api/users/switch` - Switch current user

### **Files** 
- `POST /api/files/upload` - Upload file
- `POST /api/files/process` - Process uploaded file
- `GET /api/files/recent` - Get recent uploads

### **Transactions**
- `GET /api/transactions` - Get transactions with filtering
- `POST /api/transactions/save` - Save processed transactions
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/duplicates` - Find duplicate transactions
- `POST /api/transactions/export` - Export transactions

### **Analytics**
- `GET /api/analytics/chart-data` - Get chart data
- `GET /api/analytics/insights` - Get spending insights
- `GET /api/analytics/category-transactions` - Get category details

### **Categories & Database**
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category  
- `GET /api/database/stats` - Get database statistics
- `POST /api/database/backup` - Create backup

## **UI/UX Features**

### **Modern Design**
- Material Design 3.0 inspired theme
- Smooth animations and transitions
- Mobile-first responsive design
- Intuitive navigation with breadcrumbs
- Contextual help and tooltips

### **User Experience**
- Real-time notifications and feedback
- Advanced search and filtering
- Interactive charts and visualizations  
- Bulk operations for efficiency
- Multiple export formats
- Confirmation dialogs for safety

### **Accessibility**
- Full keyboard navigation support
- Touch-friendly mobile interface
- High contrast color scheme
- 📖 Screen reader compatibility
- 🔤 Semantic HTML structure

## **Development**

### **Backend Development**
```bash
cd backend
npm run dev  # Auto-reload with nodemon
```

### **Frontend Development**
```bash
cd frontend  
npm start    # React dev server with hot-reload
```

### **Production Deployment**
```bash
# Backend
cd backend && npm start

# Frontend  
cd frontend && npm run build
# Serve build folder with your preferred web server
```

## **Performance**

- **Fast Loading**: Optimized bundle sizes and lazy loading
- **Scalable**: Handles thousands of transactions efficiently
- **Smart Caching**: Reduces API calls with intelligent caching
- **Mobile Optimized**: Smooth performance on all devices
- **Efficient Search**: Debounced search with pagination

## **Security**

- **Session-Based Auth**: Secure session management
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Configured cross-origin policies
- **SQL Injection Prevention**: Parameterized queries with Sequelize
- **File Upload Security**: Validated file types and sizes

## **What's New** (vs Original Python Flask)

### **Major Improvements**
- **Beautiful UI**: Complete redesign with Material UI
- **Rich Analytics**: Interactive charts and insights
- **Mobile Responsive**: Perfect mobile experience  
- **Better Performance**: Faster loading and smoother interactions
- **Advanced Features**: Smart filtering, bulk operations, duplicate detection
- **User Experience**: Intuitive navigation and modern design patterns

### **Technical Upgrades**
- **Modern React**: Latest React 18 with hooks
- **Material UI**: Google's design system
- **Node.js Backend**: Scalable Express.js API
- **Better Database**: Sequelize ORM with PostgreSQL support
- **Advanced Charts**: Interactive Recharts visualization
- **Responsive Design**: Mobile-first approach

## **Support**

For questions about setup, configuration, or usage:
1. Check the configuration examples in `backend/config.example.txt`
2. Review the API documentation above
3. Examine the UI improvements document in `UI_IMPROVEMENTS.md`
4. Ensure all environment variables are properly configured

## **License**

This project is created for educational and personal financial management use.

---

**Enjoy your beautiful, modern expense tracking experience!** 

The application now provides a professional-grade financial analysis tool that rivals commercial applications while maintaining the simplicity and power of the original Flask version.