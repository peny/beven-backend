# AGENTS.md

## Project Overview

This document outlines the development plan for the backend of a budgeting application, built using Fastify. The architecture emphasizes a strict separation between route handling and database logic, with the database layer functioning akin to stored procedures. The application will be deployed on Render.com.

## Architecture Principles

### Separation of Concerns
- **DB Layer** (`db/` folder): All database operations as "stored procedures"
- **Routes Layer** (`routes/` folder): HTTP request/response handling only
- **Middleware Layer** (`middleware/` folder): Authentication and validation
- **Main App** (`main.js`): Server setup and orchestration

### Database as Stored Procedures
The database layer encapsulates all data operations, providing a clean interface for the service layer and minimizing direct database interactions elsewhere in the codebase. This ensures:
- Business logic is isolated from HTTP concerns
- Codebase is more maintainable and testable
- Database operations are centralized and reusable

### Authentication Pattern
- **JWT Bearer Tokens**: No cookies, simpler for mobile apps
- **Authorization Header**: `Authorization: Bearer <token>`
- **Token Expiration**: 7 days
- **User Context**: `request.user` attached to authenticated routes

## Technology Stack

- **Framework**: Fastify 4.x
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT with Bearer tokens
- **Testing**: Jest with Supertest
- **Deployment**: Render.com

## Development Phases

### Phase 1: Core Budgeting (Current)

1. **User Authentication**
   - `POST /api/auth/register` - Register a new user
   - `POST /api/auth/login` - Authenticate an existing user
   - `GET /api/auth/me` - Get current user information

2. **Budget Management**
   - `GET /api/budgets` - Retrieve all budgets for the authenticated user
   - `GET /api/budgets/:id` - Retrieve a specific budget
   - `POST /api/budgets` - Create a new budget
   - `PUT /api/budgets/:id` - Update an existing budget
   - `DELETE /api/budgets/:id` - Delete a budget
   - `GET /api/budgets/:id/summary` - Get budget summary with totals

3. **Category Management**
   - `GET /api/budgets/:id/categories` - Retrieve categories for a specific budget
   - `GET /api/categories/:id` - Retrieve a specific category
   - `POST /api/budgets/:id/categories` - Add a new category to a budget
   - `PUT /api/categories/:id` - Update an existing category
   - `DELETE /api/categories/:id` - Delete a category

4. **Transaction Management**
   - `GET /api/transactions` - Retrieve all transactions with optional filters
   - `GET /api/budgets/:id/transactions` - Retrieve transactions for a specific budget
   - `GET /api/transactions/:id` - Retrieve a specific transaction
   - `POST /api/transactions` - Create a new transaction
   - `PUT /api/transactions/:id` - Update an existing transaction
   - `DELETE /api/transactions/:id` - Delete a transaction
   - `GET /api/budgets/:id/summary` - Get transaction summary for budget

### Phase 2: Bill Splitting (Future)

5. **Group Management**
   - `GET /api/groups` - Retrieve user's bill-splitting groups
   - `GET /api/groups/:id` - Retrieve a specific group
   - `POST /api/groups` - Create a new group
   - `PUT /api/groups/:id` - Update an existing group
   - `DELETE /api/groups/:id` - Delete a group

6. **Bill Management**
   - `GET /api/groups/:id/bills` - Retrieve bills for a specific group
   - `GET /api/bills/:id` - Retrieve a specific bill
   - `POST /api/groups/:id/bills` - Create a new bill
   - `PUT /api/bills/:id` - Update an existing bill
   - `DELETE /api/bills/:id` - Delete a bill

7. **Settlement Management**
   - `GET /api/groups/:id/settlements` - Retrieve settlement calculations
   - `POST /api/groups/:id/settlements` - Mark a bill as settled

### Phase 3: Advanced Features (Future)

8. **Analytics**
   - Routes to provide insights and analytics on budgeting and spending patterns

9. **Data Export/Import**
   - Functionality to export and import budgeting data

10. **Notifications**
    - Implement push notifications for budget reminders and updates

## Key Design Decisions

1. **Bearer Token Auth**: No cookies, simpler for mobile apps
2. **Ownership Checks**: All DB procedures verify user ownership
3. **Transaction Side Effects**: Creating/deleting transactions updates category `spentAmount`
4. **Prisma Cascade**: Delete budget → cascade to categories and transactions
5. **Error Handling**: Proper HTTP status codes and Prisma error translation
6. **Validation**: Basic validation in routes before DB calls

## Database Schema

### Models

- **User**: Authentication and user management
  - `id`, `email`, `password`, `name`, `role`, `isActive`, `createdAt`, `updatedAt`

- **Budget**: Core budget information
  - `id`, `userId`, `name`, `amount`, `period`, `startDate`, `endDate`, `createdAt`, `updatedAt`

- **Category**: Budget categories with allocation tracking
  - `id`, `budgetId`, `name`, `allocatedAmount`, `spentAmount`, `createdAt`, `updatedAt`

- **Transaction**: Individual transactions
  - `id`, `budgetId`, `categoryId`, `userId`, `amount`, `description`, `date`, `type`, `createdAt`, `updatedAt`

### Relationships

- User → Budgets (1:many)
- Budget → Categories (1:many)
- Budget → Transactions (1:many)
- Category → Transactions (1:many)
- User → Transactions (1:many)

## Environment Variables

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

### Development Setup

1. Copy `.env.example` to `.env`
2. Set up PostgreSQL database
3. Update `DATABASE_URL` in `.env`
4. Run `npm run dev:setup` to initialize database
5. Start development server with `npm run dev`

## Testing Strategy

- **Test Database**: In-memory SQLite for tests
- **Setup/Teardown**: Clean database between tests
- **Authentication Tests**: Login flow, token validation, protected routes
- **Authorization Tests**: Users can only access their own data
- **Business Logic Tests**: Transaction → category updates
- **Error Cases**: 404, 401, 400 responses

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment on Render.com

### Prerequisites

1. GitHub repository with code
2. Render account
3. PostgreSQL database (Render managed)

### Deployment Steps

1. **Create PostgreSQL Database**
   - Go to Render Dashboard → "New" → "PostgreSQL"
   - Configure name, plan, and region
   - Copy the database URL

2. **Deploy Backend Service**
   - Go to Render Dashboard → "New" → "Web Service"
   - Connect GitHub repository
   - Configure:
     - **Root Directory**: `/` (root)
     - **Environment**: Node
     - **Build Command**: `npm ci && npm run prisma:generate`
     - **Start Command**: `npm start`
     - **Node Version**: 18
   - Add Environment Variables:
     - `DATABASE_URL`: PostgreSQL URL from step 1
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: Auto-generated by Render

3. **Health Check**
   - Visit: `https://your-service.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"...","uptime":...}`

### Environment Variables for Production

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Auto-generated by Render
- `NODE_ENV` - Set to `production`
- `PORT` - Auto-provided by Render

## API Documentation

### Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Response Format

All API responses follow this format:
```json
{
  "success": true|false,
  "data": {...},
  "error": "Error message",
  "message": "Success message"
}
```

### Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Development Workflow

### Git Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Make changes and commit: `git commit -m "feat: add new feature"`
3. Push branch: `git push origin feature/description`
4. Create pull request
5. Merge after review
6. Delete branch: `git branch -d feature/description`

### Code Style

- Use meaningful variable and function names
- Add comments for complex business logic
- Follow existing patterns for consistency
- Write tests for new functionality

## Future Enhancements

### Planned Features

- [ ] Bill splitting functionality (Phase 2)
- [ ] Advanced analytics and reporting
- [ ] Data export/import
- [ ] Push notifications
- [ ] API rate limiting
- [ ] Caching with Redis
- [ ] Background job processing
- [ ] Real-time updates with WebSockets

### Performance Optimizations

- [ ] Database query optimization
- [ ] Response caching
- [ ] Connection pooling
- [ ] API pagination
- [ ] Compression middleware

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` format
   - Check database credentials
   - Ensure database is running

2. **Authentication Issues**
   - Verify JWT token format
   - Check token expiration
   - Ensure user is active

3. **Prisma Errors**
   - Run `npm run db:generate` after schema changes
   - Run `npm run db:push` to sync schema
   - Check for migration conflicts

4. **Test Failures**
   - Ensure test database is clean
   - Check test environment variables
   - Verify test data setup

## Support

For issues and questions:
- Check this documentation first
- Review error logs
- Test with provided test suite
- Create GitHub issues for bugs
- Submit feature requests via GitHub
