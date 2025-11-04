# Beven Budget Backend

A modern, full-stack budgeting application backend built with Fastify, Prisma, and PostgreSQL. Features authentication, budget management, category tracking, and transaction handling with a clean, separated architecture.

## ✨ Features

### Core Budgeting Features
- **Budgets**: Create and manage budgets with periods and amounts
- **Categories**: Organize budgets into categories with allocation tracking
- **Transactions**: Record income and expenses with automatic category updates
- **User Management**: Secure authentication with JWT tokens

### Technical Features
- **RESTful API**: Full CRUD operations for all entities
- **JWT Authentication**: Secure token-based authentication with Bearer tokens
- **Database Separation**: Clean separation between routes and database logic
- **Automatic Calculations**: Transaction amounts automatically update category spent totals
- **Ownership Security**: Users can only access their own data
- **Health Monitoring**: Built-in health checks and monitoring
- **CORS Support**: Proper cross-origin request handling

## 🛠 Tech Stack

### Backend
- **Fastify**: Fast and low overhead web framework
- **Prisma**: Modern database toolkit with type safety
- **PostgreSQL**: Production-ready database
- **JWT**: Secure authentication tokens
- **Bcrypt**: Password hashing

### Testing
- **Jest**: Backend testing framework
- **Supertest**: API endpoint testing
- **SQLite**: In-memory test database

## 📁 Project Structure

```
beven-backend/
├── db/                    # Database layer (stored procedures)
│   ├── users.js          # User authentication operations
│   ├── budgets.js        # Budget database operations
│   ├── categories.js     # Category database operations
│   └── transactions.js   # Transaction database operations
├── routes/               # API routes
│   ├── auth.js           # Authentication endpoints
│   ├── budgets.js        # Budget endpoints
│   ├── categories.js     # Category endpoints
│   └── transactions.js   # Transaction endpoints
├── middleware/           # Custom middleware
│   └── auth.js           # Authentication middleware
├── tests/               # Backend tests
│   ├── auth.test.js     # Authentication tests
│   ├── budgets.test.js  # Budget tests
│   └── transactions.test.js # Transaction tests
├── prisma/              # Database schema and migrations
│   └── schema.prisma    # Prisma schema definition
├── main.js              # Backend application entry point
├── config.js            # Configuration management
├── package.json         # Backend dependencies and scripts
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── .renderignore        # Render deployment ignore rules
├── AGENTS.md            # Development documentation
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (for production) or SQLite (for development)

### Backend Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd beven-backend
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/beven_dev"
   JWT_SECRET="your-super-secret-jwt-key-change-in-production"
   PORT=3000
   HOST="0.0.0.0"
   NODE_ENV="development"
   ```

3. **Set up the database**:
   ```bash
   npm run dev:setup
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   If you don't want to create a `.env` yet, you can start with inline env vars:
   ```bash
   JWT_SECRET=dev-secret-change-me PORT=3000 HOST=0.0.0.0 NODE_ENV=development npm run dev
   ```

The server will start on `http://localhost:3000`

### Default Admin Account

After first startup, you can log in with:
- **Email**: `admin@beven.com`
- **Password**: `admin123`

**⚠️ Important**: Change the default password after first login!

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT token)
- `GET /api/auth/me` - Get current user info

### Budgets
- `GET /api/budgets` - Get all budgets for user
- `GET /api/budgets/:id` - Get specific budget
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget
- `GET /api/budgets/:id/summary` - Get budget summary

### Categories
- `GET /api/budgets/:id/categories` - Get categories for budget
- `GET /api/categories/:id` - Get specific category
- `POST /api/budgets/:id/categories` - Add category to budget
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Transactions
- `GET /api/transactions` - Get all transactions (with filters)
- `GET /api/budgets/:id/transactions` - Get transactions for budget
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Utility
- `GET /health` - Health check
- `GET /` - API information

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

1. Register a new user:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123","name":"Test User"}'
   ```

2. Login to get a token:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

3. Use the token in subsequent requests:
   ```bash
   curl -X GET http://localhost:3000/api/budgets \
     -H "Authorization: Bearer <your_token>"
   ```

## 🗄️ Database Schema

The application includes four main entities:

- **User**: Authentication and user management
- **Budget**: Core budget information with periods and amounts
- **Category**: Budget categories with allocation and spending tracking
- **Transaction**: Individual transactions that update category totals

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Architecture Notes

This backend follows a clean architecture pattern where:

1. **Database Layer** (`db/`): Contains all database operations as "stored procedures"
2. **Routes Layer** (`routes/`): Handles HTTP requests and responses
3. **Middleware Layer** (`middleware/`): Authentication and other middleware
4. **Main Application** (`main.js`): Orchestrates the application setup

This separation ensures that business logic is isolated from HTTP concerns and makes the codebase more maintainable and testable.

## 🚀 Deployment

### Render Deployment

This application is configured for easy deployment to Render. See [AGENTS.md](./AGENTS.md) for detailed instructions.

**Quick Deploy Steps:**
1. Push code to GitHub
2. Connect repository to Render
3. Create PostgreSQL database
4. Deploy web service with environment variables
5. Test your live API!

### Environment Variables

**Production:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (auto-generated on Render)
- `NODE_ENV`: Set to `production`
- `PORT`: Auto-provided by Render

### Database

- **Development**: SQLite (local file)
- **Production**: PostgreSQL (Render managed)

The Prisma schema automatically adapts to the database provider based on the `DATABASE_URL` environment variable.

## 🎯 Roadmap

### Phase 1: Core Budgeting (Current)
- ✅ Authentication and authorization
- ✅ Budget management
- ✅ Category management
- ✅ Transaction handling
- ✅ Testing suite
- ✅ Production deployment

### Phase 2: Bill Splitting (Planned)
- [ ] Group management
- [ ] Bill splitting functionality
- [ ] Settlement calculations

### Phase 3: Advanced Features (Planned)
- [ ] Analytics and reporting
- [ ] Data export/import
- [ ] Push notifications
- [ ] API rate limiting
- [ ] Caching with Redis

## 📄 License

MIT License - feel free to use this as a starting point for your own budgeting application!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

**Built with ❤️ using modern web technologies**
# Force restart
