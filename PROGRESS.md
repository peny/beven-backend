# Beven Budget Backend - Progress

## Status: 🔄 Phase 2 In Progress - Deployment Issue

**URL**: https://beven-budget-backend-frankfurt.onrender.com  
**Tech**: Fastify + PostgreSQL + Prisma + JWT + Redis  
**Architecture**: Routes ↔ DB separation (stored procedures pattern)

## ✅ Completed (Phase 1)
- [x] **Auth**: JWT Bearer tokens, register/login/me endpoints
- [x] **Budgets**: CRUD operations, summary calculations
- [x] **Categories**: CRUD with automatic spent amount tracking
- [x] **Transactions**: CRUD with category updates
- [x] **Database Layer**: All stored procedures implemented
- [x] **Testing**: Jest setup with basic tests
- [x] **Deployment**: Live on Render.com (Frankfurt)

## ✅ Completed (Phase 2 - Code Ready)
- [x] **Bill Splitting**: Split creation, participants, payment tracking
- [x] **User Connections**: Friends system with email-based connections
- [x] **Enhanced Backend**: Rate limiting, validation, security headers
- [x] **Redis Caching**: Production-ready with fallback
- [x] **Frontend Integration Guide**: Complete API documentation

## 🔄 Current Issue
- [ ] **Deployment Stuck**: Render service not updating despite multiple pushes
- [ ] **Route Registration**: New endpoints not accessible (404 errors)
- [ ] **Frontend Integration**: Waiting for backend endpoints to be live

## 🔄 Planned (Phase 3)
- [ ] **Analytics**: Spending patterns, budget insights
- [ ] **Advanced Features**: Notifications, data export/import

## ❌ Abandoned Approaches
- **Cookie-based Auth**: Initially tried but switched to JWT Bearer tokens for mobile compatibility
- **SQLite for Production**: Tested but insufficient for concurrent users
- **Express.js**: Considered but chose Fastify for better performance
- **Manual DB Migrations**: Abandoned in favor of Prisma's automatic schema management
- **Node-cache Only**: Initially used but switched to Redis with fallback for production scalability
- **Complex Route Registration**: Simplified approach due to deployment issues

## API Endpoints

### ✅ Live (Phase 1)
```
GET  /health                    # Health check
GET  /                          # API info
POST /api/auth/register         # User registration
POST /api/auth/login            # User login
GET  /api/auth/me              # Current user
GET  /api/budgets              # List budgets
POST /api/budgets              # Create budget
GET  /api/budgets/:id/summary  # Budget summary
# + categories, transactions CRUD
```

### 🔄 Ready but Not Deployed (Phase 2)
```
GET  /api/splits               # List user's splits
POST /api/splits               # Create split
GET  /api/splits/:id           # Get specific split
PATCH /api/splits/:id/participants/:pid/paid  # Mark paid
DELETE /api/splits/:id         # Delete split
GET  /api/connections          # List user's connections
POST /api/connections          # Add connection
# + enhanced features (rate limiting, validation, security)
```

---
**Last Updated**: Oct 28, 2025

## Local Start Notes (JWT)

- Set `JWT_SECRET` before starting locally. Either:
  - Create `.env` (from `.env.example`) and set `JWT_SECRET`.
  - Or run inline:

```bash
JWT_SECRET=dev-secret-change-me PORT=3000 HOST=0.0.0.0 NODE_ENV=development npm run dev
```

- Verify:

```bash
curl http://localhost:3000/health
```
