# Grow United Quote Builder

A comprehensive, enterprise-grade quotation management system built with modern web technologies. This application provides a complete solution for managing customers, products, quotations, and company settings with role-based access control and professional PDF generation capabilities.

## 🚀 Features

### Core Functionality
- **Customer Management**: Complete CRM functionality with contact details, VAT numbers, and opportunity tracking
- **Product Catalog**: Advanced product management with SKU tracking, pricing, categories, and inventory control
- **Quote Builder**: Professional quotation creation with line items, discounts, VAT calculations, and custom notes
- **Company Settings**: Comprehensive company branding, logo management, and default configuration
- **User Management**: Role-based user administration with admin and regular user roles
- **Dashboard Analytics**: Real-time insights with recent quotes, top products, and monthly value charts
- **Print Support**: Professional PDF-style quotation generation

### Advanced Features
- **Role-Based Access Control**: Admin-only access to delete, archive, and restore operations
- **Soft Delete System**: Safe deletion with restore capabilities for all entities
- **Archive Management**: Archive and unarchive quotes and products
- **Search & Filtering**: Advanced search across customers, products, and quotes
- **Responsive Design**: Mobile-first design with clay-morphism UI elements
- **Real-time Updates**: Live data synchronization between frontend and backend

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
- **Alembic** - Database migration tool

### Database
- **PostgreSQL** with async support
- **SQLAlchemy ORM** for database operations
- **Automatic migrations** on application startup

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
The application uses a simple authentication system with hardcoded credentials for demo purposes. In production, implement proper JWT-based authentication.

**Demo Credentials:**
- **Admin**: `admin@example.com` / `admin123`
- **User**: `user@example.com` / `user123`

### Endpoints

#### Company Settings
- `GET /api/company-settings` - Get company settings
- `PUT /api/company-settings` - Update company settings

#### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/{id}` - Get customer by ID
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer (soft delete)

#### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/{id}` - Get product by ID
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product (soft delete) **[Admin Only]**
- `POST /api/products/{id}/restore` - Restore deleted product **[Admin Only]**
- `GET /api/products/deleted` - List deleted products

#### Quotes
- `GET /api/quotes` - List all quotes
- `POST /api/quotes` - Create new quote
- `GET /api/quotes/{id}` - Get quote by ID
- `PUT /api/quotes/{id}` - Update quote
- `DELETE /api/quotes/{id}` - Delete quote (soft delete) **[Admin Only]**
- `POST /api/quotes/{id}/restore` - Restore deleted quote **[Admin Only]**
- `POST /api/quotes/{id}/archive` - Archive quote **[Admin Only]**
- `POST /api/quotes/{id}/unarchive` - Unarchive quote **[Admin Only]**
- `GET /api/quotes/deleted` - List deleted quotes
- `GET /api/quotes/archived` - List archived quotes

#### Users
- `GET /api/users` - List all users **[Admin Only]**
- `POST /api/users` - Create new user **[Admin Only]**
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user (soft delete) **[Admin Only]**
- `POST /api/users/{id}/restore` - Restore deleted user **[Admin Only]**
- `GET /api/users/deleted` - List deleted users
- `POST /api/users/verify-login` - Verify user login credentials
- `PUT /api/users/{id}/change-password` - Change user password

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
  "detail": "Error message description"
}
```

## 🔐 Security Features

### Role-Based Access Control
- **Admin Users**: Full access to all features including delete, archive, and restore operations
- **Regular Users**: Limited access to view and edit operations only
- **Protected Endpoints**: Sensitive operations require admin authentication

### Data Protection
- **Soft Delete**: All deletions are reversible
- **Input Validation**: Comprehensive data validation using Pydantic schemas
- **SQL Injection Prevention**: SQLAlchemy ORM provides built-in protection
- **CORS Configuration**: Proper cross-origin resource sharing setup

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
- **Foreign Keys**: Proper relational integrity
- **Indexes**: Optimized query performance

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
- [ ] Configure environment variables
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
npm test
```

### Test Coverage
- Unit tests for all API endpoints
- Integration tests for database operations
- Frontend component testing
- End-to-end user flow testing

## 📈 Performance

### Optimization Features
- **Database Indexing**: Optimized queries for large datasets
- **Lazy Loading**: Efficient data loading strategies
- **Caching**: Redis integration for frequently accessed data
- **Pagination**: Large dataset handling
- **Compression**: Gzip compression for API responses

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
- **API Docs**: Available at `/docs` endpoint
- **Code Comments**: Comprehensive inline documentation
- **README**: This comprehensive guide

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

**Built with ❤️ by the Grow United development team**# Quote-App
