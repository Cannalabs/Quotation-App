# Grow United Quote Builder

A comprehensive, enterprise-grade quotation management system built with modern web technologies. This application provides a complete solution for managing customers, products, quotations, and company settings with role-based access control and professional PDF generation capabilities.

## 🚀 Features

### Core Functionality
- **Customer Management**: Complete CRM functionality with contact details, VAT numbers, and opportunity tracking
- **Product Catalog**: Advanced product management with SKU tracking, pricing, categories, and inventory control
- **Quote Builder**: Professional quotation creation with line items, discounts, VAT calculations, and custom notes
- **Email System**: Professional HTML email templates with PDF attachments, SMTP configuration, and mobile-responsive design
- **Company Settings**: Comprehensive company branding, logo management, and default configuration
- **User Management**: Role-based user administration with admin and regular user roles, password management, and forgot password functionality
- **Dashboard Analytics**: Real-time insights with recent quotes, top products, and monthly value charts
- **Print Support**: Professional PDF-style quotation generation

### Advanced Features
- **Role-Based Access Control**: Admin-only access to delete, archive, and restore operations
- **Soft Delete System**: Safe deletion with restore capabilities for all entities
- **Archive Management**: Archive and unarchive quotes and products
- **Search & Filtering**: Advanced search across customers, products, and quotes
- **Responsive Design**: Mobile-first design with clay-morphism UI elements
- **Email Features**: 
  - Professional HTML email templates with responsive mobile design
  - Automatic PDF attachment generation for quotations
  - SMTP configuration through UI (Company Settings → Email Settings)
  - Logo inline attachments for better email client compatibility
  - Conditional discount display in email templates
  - Test email functionality to verify SMTP settings
- **Password Management**: 
  - User password change (requires current password)
  - Admin password reset (for any user)
  - Forgot password request (contact administrator)
  - Email enumeration attack prevention
- **Real-time Updates**: Live data synchronization between frontend and backend
- **Discount Validation**: Prevents negative subtotals - fixed discounts cannot exceed subtotal
- **Comprehensive Input Validation**: Business rule validators for prices, quantities, VAT rates, discounts
- **Enhanced Error Messages**: User-friendly validation errors displayed on the page
- **Business Rule Enforcement**: Prevents invalid operations (e.g., deleting customers with active quotes)

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks and context
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - Python SQL toolkit and ORM
- **PostgreSQL** - Robust relational database
- **Pydantic** - Data validation using Python type annotations
- **Uvicorn** - ASGI server for production deployment
- **Pytest** - Comprehensive testing framework

### Database
- **PostgreSQL** with async support
- **SQLAlchemy ORM** for database operations
- **Automatic migrations** on application startup (adds missing columns automatically)
- **99 columns** across 7 tables managed automatically

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd grow-united-quotation-app
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv ../venv

# Activate virtual environment
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database Setup
```bash
# Create PostgreSQL database
createdb grow

# The application will automatically create tables on first run
```

### 4. Frontend Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API configuration
```

## 🏃‍♂️ Running the Application

### Development Mode

#### Backend Server
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

#### Frontend Server
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173 (or next available port)
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs

### Production Mode

#### Build Frontend
```bash
npm run build
```

#### Run Backend
```bash
cd backend
source ../venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 3000
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
🔐 **JWT Authentication**: The application uses JWT (JSON Web Tokens) for secure authentication.

**Login Endpoint:**
- `POST /api/users/verify-login` - Authenticate user and receive JWT token
  - Request: `{ "email": "user@example.com", "password": "password123" }`
  - Response: `{ "access_token": "jwt_token", "token_type": "bearer", "user": {...} }`
  - Token expires in 30 days (configurable)

**Protected Endpoints:**
- All endpoints except `/api/users/verify-login`, `/api/users/forgot-password`, and `/api/company-settings/public` require authentication
- Include JWT token in request header: `Authorization: Bearer <token>`
- Invalid or missing tokens return 401/403 Unauthorized

**Role-Based Access:**
- **Admin users**: Full access to all endpoints including delete, archive, restore operations
- **Regular users**: Can access their own profile and general data, but cannot:
  - Access other users' profiles
  - Create/delete users
  - Access admin-only endpoints (company settings, deleted items, etc.)


### Endpoints

#### Company Settings
- `GET /api/company-settings/public` - Get public company info (name, logo) **[Public - No Auth]**
- `GET /api/company-settings` - Get company settings **[Admin Only]**
- `PUT /api/company-settings` - Update company settings **[Admin Only]**

#### Customers
- `GET /api/customers` - List all customers **[Auth Required]**
- `POST /api/customers` - Create new customer **[Auth Required]**
- `GET /api/customers/{id}` - Get customer by ID **[Auth Required]**
- `PUT /api/customers/{id}` - Update customer **[Auth Required]**
- `DELETE /api/customers/{id}` - Delete customer (soft delete) **[Auth Required]**
- `POST /api/customers/{id}/restore` - Restore deleted customer **[Auth Required]**

#### Products
- `GET /api/products` - List all products **[Auth Required]**
- `POST /api/products` - Create new product **[Auth Required]**
- `GET /api/products/{id}` - Get product by ID **[Auth Required]**
- `PUT /api/products/{id}` - Update product **[Auth Required]**
- `DELETE /api/products/{id}` - Delete product (soft delete) **[Admin Only]**
- `POST /api/products/{id}/restore` - Restore deleted product **[Admin Only]**
- `GET /api/products/deleted` - List deleted products **[Auth Required]**

#### Quotes
- `GET /api/quotes` - List all quotes with pagination **[Auth Required]**
  - Query params: `skip` (default: 0), `limit` (default: 50, max: 100), `include_deleted` (default: false)
  - Example: `/api/quotes?skip=0&limit=20`
- `POST /api/quotes` - Create new quote (with discount validation) **[Auth Required]**
- `GET /api/quotes/{id}` - Get quote by ID **[Auth Required]**
- `PUT /api/quotes/{id}` - Update quote (with discount validation) **[Auth Required]**
- `DELETE /api/quotes/{id}` - Delete quote (soft delete) **[Admin Only]**
- `POST /api/quotes/{id}/restore` - Restore deleted quote **[Admin Only]**
- `POST /api/quotes/{id}/archive` - Archive quote **[Admin Only]**
- `POST /api/quotes/{id}/unarchive` - Unarchive quote **[Admin Only]**
- `GET /api/quotes/deleted` - List deleted quotes with pagination **[Admin Only]**
  - Query params: `skip` (default: 0), `limit` (default: 50, max: 100)
  - Example: `/api/quotes/deleted?skip=0&limit=20`

**Quote Validation:**
- Fixed discounts cannot exceed subtotal
- Percentage discounts must be 0-100%
- Totals are automatically calculated and validated

#### Users
- `GET /api/users` - List all users **[Auth Required, Admin Only]**
- `POST /api/users` - Create new user **[Auth Required, Admin Only]**
- `GET /api/users/{id}` - Get user by ID **[Auth Required]** (Users can only access their own profile)
- `PUT /api/users/{id}` - Update user **[Auth Required]** (Users can only update their own profile)
- `DELETE /api/users/{id}` - Delete user (soft delete) **[Auth Required, Admin Only]**
- `POST /api/users/{id}/restore` - Restore deleted user **[Auth Required, Admin Only]**
- `GET /api/users/deleted` - List deleted users **[Auth Required]**
- `POST /api/users/verify-login` - Verify user login credentials **[Public - Returns JWT Token]**
- `POST /api/users/{id}/change-password` - Change user password (requires current password) **[Auth Required]**
- `POST /api/users/{id}/reset-password` - Admin reset password (does not require current password) **[Auth Required, Admin Only]**
- `POST /api/users/forgot-password` - Forgot password request **[Public - No Auth]**

#### Email Settings
- `GET /api/email/config` - Get email configuration (SMTP settings) **[Auth Required]**
- `GET /api/email/config-status` - Check email configuration status **[Auth Required]**
- `POST /api/email/save-config` - Save email configuration (SMTP settings) **[Auth Required]**
- `POST /api/email/send-quotation` - Send quotation email with HTML template and PDF attachment **[Auth Required]**
- `POST /api/email/send-test` - Send test email to verify SMTP configuration **[Auth Required]**

**Email Features:**
- Professional HTML email templates with responsive mobile design
- Automatic PDF attachment generation from quotation data
- Logo inline attachments (CID) for better email client compatibility
- Conditional discount display (only shown if discount exists)
- Mobile-responsive layout that stacks fields vertically on small screens
- Full date formatting (DD/MM/YYYY) for validity dates

### Response Formats

All endpoints return JSON responses with the following structure:

#### Success Response
```json
{
  "id": 1,
  "name": "Example",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### Error Response
```json
{
  "detail": "Error message description",
  "error": "error_type"  // Optional: error type for client handling
}
```

**Error Types:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid token but insufficient permissions
- `400 Bad Request`: Validation errors (preserves specific error messages)
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Request validation errors (Pydantic)
- `500 Internal Server Error`: Server errors (generic message, details logged server-side)

**Browser vs API Responses:**
- Browser requests to protected endpoints receive HTML error pages
- API requests (with `Accept: application/json`) receive JSON error responses

## 🔐 Security Features

### JWT Authentication
- **Token-Based Authentication**: All protected endpoints require JWT tokens
- **Secure Token Storage**: Tokens stored in browser localStorage
- **Token Expiration**: 30-day expiration (configurable)
- **Automatic Token Refresh**: Frontend handles token validation and refresh
- **Secure Secret Key**: JWT secret key configurable via environment variables

### Role-Based Access Control
- **Admin Users**: Full access to all features including delete, archive, and restore operations
- **Regular Users**: Limited access to view and edit operations only
- **Protected Endpoints**: All data endpoints require authentication
- **User Profile Access**: Users can only access/modify their own profile
- **Admin-Only Operations**: Delete, restore, and sensitive configuration endpoints restricted to admins

### Error Handling & Security
- **Centralized Exception Handling**: All errors logged server-side with full details
- **Generic Client Messages**: Clients receive user-friendly error messages without exposing internal details
- **HTML Error Pages**: Browser requests to protected endpoints receive user-friendly HTML error pages
- **JSON API Responses**: API clients receive proper JSON error responses
- **Validation Error Preservation**: 400 errors preserve specific validation messages for better UX

### Data Protection
- **Soft Delete**: All deletions are reversible
- **Comprehensive Input Validation**: Business rule validators for all fields:
  - VAT rates: 0-100% validation
  - Prices: Non-negative validation
  - Quantities: Positive number validation
  - Discounts: Validated against subtotal (prevents negative totals)
  - String lengths: Maximum length constraints
- **Business Rule Enforcement**: 
  - Cannot delete customers with active quotes
  - Cannot use deleted/archived products in quotes
  - Cannot update/delete quotes in certain states
- **SQL Injection Prevention**: SQLAlchemy ORM provides built-in protection
- **CORS Configuration**: Proper cross-origin resource sharing setup (uses config.py)
- **Frontend Error Display**: Validation errors shown on page, not just in console

## 🎨 UI/UX Features

### Design System
- **Clay-morphism Design**: Modern, tactile interface elements
- **Responsive Layout**: Mobile-first design approach
- **Dark/Light Theme**: Adaptive color schemes
- **Accessibility**: WCAG compliant components

### User Experience
- **Real-time Search**: Instant search across all entities
- **Bulk Operations**: Select and manage multiple items
- **Drag & Drop**: Intuitive file uploads
- **Keyboard Shortcuts**: Power user features
- **Loading States**: Smooth user feedback

## 📊 Database Schema

### Core Tables
- **customers** - Customer information and contact details
- **products** - Product catalog with pricing and inventory
- **quotes** - Quotation headers and metadata
- **quote_items** - Individual line items within quotes
- **users** - User accounts and authentication
- **company_settings** - Company configuration and branding

### Key Features
- **Soft Delete**: `deleted` and `archived` flags for safe data management
- **Audit Trail**: `created_at` and `updated_at` timestamps
- **Foreign Keys**: Proper relational integrity with CASCADE/RESTRICT rules
- **Indexes**: Optimized query performance on frequently searched fields
- **Automatic Migrations**: Missing columns added automatically on server startup
- **99 Columns**: Across 7 tables managed automatically

### Database Migration System
- **Automatic Column Addition**: When you add new fields to models, they're automatically added to database
- **Safe Operations**: Only adds columns (never removes or modifies)
- **Zero Downtime**: Adds columns without blocking existing operations

## 🚀 Deployment

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/grow
SECRET_KEY=your-secret-key
DEBUG=True
```

#### Frontend (.env.local)
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Grow United Quote Builder
```

### Production Checklist
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables (see `env.example`)
- [ ] **Set JWT secret key** in `backend/.env.conf` (generate secure random key)
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Review and test all protected endpoints
- [ ] Verify CORS settings for production domains
## 🧪 Testing

### Running Tests
```bash
# Backend tests (124 tests, all passing)
cd backend
source ../venv/bin/activate  # Activate virtual environment
pytest tests/ -v

# Run with HTML report
pytest tests/ -v --html=test_report.html --self-contained-html

# Run with coverage report
pytest tests/ -v --cov=. --cov-report=html --cov-report=term

# Run specific test file
pytest tests/test_quotes.py -v
pytest tests/test_products.py -v
pytest tests/test_customers.py -v
pytest tests/test_protected_routes.py -v

# Run specific test
pytest tests/test_protected_routes.py::test_protected_endpoint_no_token -v
```

### Test Coverage
- **124 automated tests** covering all major functionality
- Unit tests for all API endpoints
- Integration tests for database operations
- Authentication and authorization tests (30+ protected route tests)
- Discount validation tests
- Business rule validation tests
- Edge cases and error handling tests
- Data normalization tests

### Test Files
- `test_quotes.py` - Quote API tests including discount validation and pagination
- `test_products.py` - Product API tests including validation
- `test_customers.py` - Customer API tests including business rules
- `test_users.py` - User API tests including authentication
- `test_company_settings.py` - Company settings tests
- `test_protected_routes.py` - Comprehensive authentication and authorization tests (30+ tests)

**All 124 tests passing** ✅

## 📈 Performance

### Optimization Features
- **Database Indexing**: Optimized queries for large datasets
- **Selectin Loading**: Efficient data loading with `selectinload` to prevent N+1 queries
- **Code Refactoring**: ~500+ lines of duplicated code eliminated across all routers
- **Helper Functions**: Consistent patterns for commit/refresh, entity lookups, and validations
- **Pagination**: Large dataset handling (products, customers, users, quotes endpoints)
  - Default limit: 50 records per page
  - Maximum limit: 100 records per page
  - Skip parameter for page navigation
- **Async Operations**: Full async/await support for non-blocking I/O

### Monitoring
- **API Response Times**: Performance tracking
- **Database Query Analysis**: Query optimization
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Usage pattern analysis

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **CSS**: Follow Tailwind CSS conventions
- **Git**: Use conventional commit messages

## 📞 Support

### Documentation
- **API Docs**: Available at `/docs` endpoint (Swagger UI)
- **Code Comments**: Comprehensive inline documentation
- **README**: This comprehensive guide
- **Email Setup**: See `EMAIL_SETUP.md` for email configuration instructions

### Contact
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **FastAPI** team for the excellent web framework
- **React** team for the powerful UI library
- **Tailwind CSS** for the utility-first CSS framework
- **Radix UI** for accessible component primitives

---

**Built with ❤️ by the Grow United development team**

---

## 📝 Recent Updates (November 2025)

### ✅ Security Improvements
- **JWT Authentication**: Implemented secure JWT-based authentication for all endpoints
- **Protected Routes**: All data endpoints now require authentication
- **Role-Based Access Control**: Enhanced RBAC with user profile access restrictions
- **Centralized Exception Handling**: Server-side logging with generic client messages
- **HTML Error Pages**: Browser-friendly error pages for protected endpoints
- **Password Security**: Login response excludes password_hash from user data

### ✅ Code Quality Improvements
- **Code Duplication Eliminated**: All routers refactored with consistent helper function patterns
- **~500+ lines of duplicated code removed** across quotes, products, customers, email, company_settings, and users routers
- **Consistent Patterns**: `_commit_and_refresh()`, `_get_X_or_404()` helpers in all routers
- **Exception Handler**: Centralized error handling with proper logging and client-friendly messages

### ✅ New Features

#### Email System (Added by aqlos)
- **Professional HTML Email Templates**: Beautiful, responsive email templates with company branding
- **Mobile-Responsive Design**: Email templates automatically adapt to mobile devices with vertical stacking
- **PDF Attachments**: Automatic PDF generation and attachment for quotation emails
- **SMTP Configuration UI**: Configure email settings through Company Settings → Email Settings
- **Logo Inline Attachments**: Company logo embedded as inline attachment (CID) for better email client compatibility
- **Conditional Discount Display**: Discount field only shown in email when discount exists
- **Test Email Functionality**: Send test emails to verify SMTP configuration
- **Email Client Compatibility**: Works with Gmail, Outlook, and other major email clients

#### Password Management (Added by aqlos)
- **Forgot Password**: Users can request password reset (redirects to contact administrator)
- **Email Enumeration Prevention**: Forgot password endpoint prevents email enumeration attacks
- **Password Change**: Users can change their password (requires current password)
- **Admin Password Reset**: Admins can reset any user's password without knowing current password

#### Business Logic Improvements
- **Discount Validation**: Prevents negative subtotals when fixed discounts exceed subtotal
- **Enhanced Error Messages**: Validation errors displayed on page, not just in terminal
- **Business Rule Validations**: Prevents invalid operations (e.g., deleting customers with active quotes)
- **Data Normalization**: `tax_id` field automatically maps to `vat_number`
- **Full Date Formatting**: Validity dates now display in full DD/MM/YYYY format

### ✅ Testing
- **124 Tests**: Comprehensive test suite covering all major functionality (up from 96)
- **30+ Protected Route Tests**: New comprehensive test suite for authentication and authorization
- **Pagination Tests**: Tests for quotes pagination functionality
- **All Tests Passing**: 100% test success rate (124/124 passing)
- **Test Fixtures**: Shared authentication fixtures for all test files
- **HTML Test Reports**: Detailed test reports with coverage analysis

### ✅ API Improvements
- **Public Endpoints**: Company settings public endpoint for login page
- **User Profile Restrictions**: Users can only access/modify their own profiles
- **Error Response Format**: Consistent error responses with proper status codes
- **Browser Detection**: Smart error handling (HTML for browsers, JSON for API clients)
- **Pagination Support**: Quotes endpoints now support pagination (skip/limit parameters)

*Last Updated: November 2025*
