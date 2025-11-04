# AGENTS.md

## Project Overview

This document outlines the development plan for the backend of a budgeting application, built using Fastify. The architecture emphasizes a strict separation between route handling and database logic, with the database layer functioning akin to stored procedures. The application will be deployed on Render.com.

## Quick Reference

- **Live URL**: https://beven-budget-backend-frankfurt.onrender.com
- **Tech Stack**: Fastify + PostgreSQL + Prisma + JWT
- **Architecture**: Routes ↔ DB separation (stored procedures pattern)
- **Status**: Phase 1 Complete, Phase 2 Planned
- **Repository**: https://github.com/peny/beven-backend

## Current Status

### ✅ Phase 1 Complete (October 2025)
- **Authentication**: JWT Bearer tokens implemented
- **Core Features**: Budgets, categories, transactions CRUD
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest test suite with basic coverage
- **Deployment**: Live on Render.com (Frankfurt region)
- **Documentation**: Complete API documentation

### 🔄 Next Steps
- **Phase 2**: Bill splitting system design
- **Phase 3**: Analytics and advanced features
- **Monitoring**: Performance optimization and error tracking

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

## Recent Decisions & Context

### ✅ Implemented Solutions
- **Fastify over Express**: Better performance and TypeScript support
- **PostgreSQL over SQLite**: Production-ready concurrent access
- **JWT Bearer over Cookies**: Mobile app compatibility
- **Prisma over Raw SQL**: Type safety and migration management
- **Render.com Deployment**: Easy PostgreSQL integration

### 🔧 Current Configuration
- **Database**: PostgreSQL on Render (Frankfurt region)
- **Authentication**: JWT with 7-day expiration
- **CORS**: Enabled for all origins (development)
- **Logging**: Fastify built-in logger with pretty print in dev

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

## Common Tasks & Commands

### Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio
```

### Deployment
```bash
# Production build
npm run build

# Deploy to Render (automatic on push to main)
git push origin main
```

### Testing API
```bash
# Health check
curl https://beven-budget-backend-frankfurt.onrender.com/health

# Register user
curl -X POST https://beven-budget-backend-frankfurt.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

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

## PROGRESS.md Maintenance

### Keeping Track of Abandoned Approaches

The `PROGRESS.md` file should be updated regularly to document approaches that have been tried and abandoned. This prevents repeating failed attempts and helps maintain project context.

#### What to Document:
- **Failed Implementations**: Approaches that didn't work and why
- **Abandoned Features**: Features that were planned but later removed
- **Technical Decisions**: Why certain technologies or patterns were rejected
- **Performance Issues**: Problems encountered and solutions attempted
- **Deployment Challenges**: Issues faced during deployment and how they were resolved

#### Format for Abandoned Items:
```markdown
## ❌ Abandoned Approaches
- **Cookie-based Auth**: Initially tried but switched to JWT Bearer tokens for mobile compatibility
- **SQLite for Production**: Tested but insufficient for concurrent users
- **Express.js**: Considered but chose Fastify for better performance
- **Manual DB Migrations**: Abandoned in favor of Prisma's automatic schema management
- **Node-cache Only**: Initially used but switched to Redis with fallback for production scalability
- **Complex Route Registration**: Simplified approach due to deployment issues
```

#### When to Update:
- After major architectural decisions
- When switching technologies or approaches
- After resolving deployment issues
- When abandoning planned features
- During code reviews that identify better patterns

This practice ensures that future development doesn't repeat past mistakes and maintains institutional knowledge about why certain decisions were made.

## Deployment Issues & Solutions

### Render.com Free Tier Limitations
- **Slow Deployments**: Can take 15-30 minutes on free tier
- **Stuck Deployments**: Services may not update despite multiple pushes
- **Resource Constraints**: Limited build resources cause delays
- **Instance Switching**: Slow transition between old/new instances

### Troubleshooting Steps:
1. **Check deployment status** in Render dashboard
2. **Monitor logs** for build/deployment errors
3. **Force restart** with small code changes
4. **Simplify configuration** if complex routes cause issues
5. **Consider upgrading** to paid tier for faster deployments

### Alternative Solutions:
- **Vercel**: Faster deployments, good for Node.js
- **Railway**: Modern platform with better free tier
- **Heroku**: Reliable but more expensive
- **Self-hosted**: VPS with Docker for full control

## Support

For issues and questions:
- Check this documentation first
- Review error logs
- Test with provided test suite
- Create GitHub issues for bugs
- Submit feature requests via GitHub

## GitHub Access

### **ONLY** Use GitHub CLI

**CRITICAL**: GitHub CLI (`gh`) is the **ONLY** way to access GitHub. Never use browser automation or API tokens directly.

### Authentication Check

Always verify authentication before GitHub operations:

```bash
gh auth status
```

### If Not Authenticated

If authentication fails, guide the user through one-time code authentication:

1. Run: `gh auth login -h github.com`
2. Select: **"GitHub.com"**
3. Choose: **"Login with a web browser"**
4. User will receive a one-time code
5. User visits: https://github.com/login/device
6. User enters the code
7. Verify: `gh auth status` should show authenticated

**IMPORTANT**: Always use one-time code authentication. Never use token-based auth.

### GitHub Operations

All GitHub operations use `gh` CLI:

- Create/update PRs: `gh pr create`, `gh pr edit`
- View PRs: `gh pr list`, `gh pr view`
- Add comments: `gh pr comment`
- Merge PRs: `gh pr merge`
- Check auth: `gh auth status`
