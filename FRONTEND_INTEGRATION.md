# Backend Integration Guide for Frontend Team

<p align="center">
  <img src="assets/logo.png" alt="Beven Logo" width="160" />
  
</p>

## 🚀 **API Base URL**
```
https://beven-budget-backend-frankfurt.onrender.com
```

## 🔐 **Authentication**
All API endpoints require JWT Bearer token authentication:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

## 📊 **Response Format**
All API responses follow this consistent format:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

## ⚡ **Caching Information**
**IMPORTANT**: The backend implements Redis caching for better performance:

### Cached Endpoints (5-minute TTL):
- `GET /api/budgets` - User's budgets
- `GET /api/budgets/:id` - Specific budget
- `GET /api/budgets/:id/summary` - Budget summary
- `GET /api/splits` - User's splits
- `GET /api/connections` - User's connections

### Cache Behavior:
- **Cache MISS**: First request hits database (~100-200ms)
- **Cache HIT**: Subsequent requests served from Redis (~50-100ms)
- **Auto-invalidation**: Cache automatically clears when data changes (POST/PUT/DELETE)

### Frontend Implications:
- ✅ **No special handling needed** - caching is transparent
- ✅ **Faster responses** after first load
- ✅ **Consistent data** - cache invalidates on updates
- ⚠️ **Don't implement client-side caching** - backend handles it efficiently

## 🎯 **Available Endpoints**

### Authentication
```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login user
GET  /api/auth/me         # Get current user
```

### Budget Management
```
GET    /api/budgets              # List user's budgets
POST   /api/budgets              # Create budget
GET    /api/budgets/:id          # Get specific budget
PUT    /api/budgets/:id          # Update budget
DELETE /api/budgets/:id          # Delete budget
GET    /api/budgets/:id/summary  # Budget summary with totals
```

### Category Management
```
GET    /api/budgets/:id/categories  # List categories for budget
POST   /api/budgets/:id/categories  # Create category
GET    /api/categories/:id          # Get specific category
PUT    /api/categories/:id          # Update category
DELETE /api/categories/:id          # Delete category
```

### Transaction Management
```
GET    /api/transactions           # List transactions (with filters)
POST   /api/transactions           # Create transaction
GET    /api/transactions/:id       # Get specific transaction
PUT    /api/transactions/:id       # Update transaction
DELETE /api/transactions/:id       # Delete transaction
```

### 🆕 Bill Splitting (NEW!)
```
GET    /api/splits                           # List user's splits
POST   /api/splits                           # Create split
GET    /api/splits/:id                       # Get specific split
PATCH  /api/splits/:id/participants/:pid/paid # Mark participant as paid
DELETE /api/splits/:id                       # Delete split
```

### 🆕 User Connections (NEW!)
```
GET    /api/connections        # List user's connections
POST   /api/connections        # Add connection by email
GET    /api/connections/:id    # Get specific connection
DELETE /api/connections/:id    # Delete connection
GET    /api/connections/search # Search users (query: ?q=searchterm)
```

## 📋 **Data Structures**

### Split Creation
```typescript
interface CreateSplitRequest {
  title: string;
  totalAmount: number;
  participants: {
    name: string;
    email?: string;
    amount: number;
  }[];
  transactionId?: number; // Optional link to budget transaction
}
```

### Split Response
```typescript
interface Split {
  id: number;
  title: string;
  totalAmount: number;
  createdBy: number;
  createdAt: string;
  transactionId?: number;
  participants: SplitParticipant[];
  creator: { id: number; name: string; email: string };
  transaction?: { id: number; description: string; amount: number };
}

interface SplitParticipant {
  id: number;
  name: string;
  email?: string;
  amount: number;
  isPaid: boolean;
  isConnectedUser: boolean;
  userId?: number;
  user?: { id: number; name: string; email: string };
}
```

### Connection Management
```typescript
interface CreateConnectionRequest {
  email: string;
  name?: string; // Optional override
}

interface Connection {
  id: number;
  name: string;
  email: string;
  username?: string;
  connectedTo?: { id: number; name: string; email: string };
}
```

## 🔧 **Business Logic Notes**

### Split Logic:
1. **Auto-payment**: Creator is automatically marked as paid when split is created
2. **Amount validation**: Participant amounts must equal total amount
3. **User linking**: Participants with emails are automatically linked to existing users
4. **Transaction integration**: Splits can be created from budget transactions

### Connection Logic:
1. **Email-based**: Connections are primarily email-based
2. **User lookup**: System automatically finds existing users by email
3. **Self-prevention**: Users cannot add themselves as connections
4. **Duplicate prevention**: Each user can only have one connection per email

## 🚨 **Error Handling**

### Common Error Codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Example Error Response:
```json
{
  "success": false,
  "error": "Title, totalAmount, and participants are required"
}
```

## 🧪 **Testing Endpoints**

### Health Check:
```bash
curl https://beven-budget-backend-frankfurt.onrender.com/health
```

### API Info:
```bash
curl https://beven-budget-backend-frankfurt.onrender.com/
```

## 📈 **Performance Notes**

- **Redis Caching**: 5-minute TTL for GET requests
- **Database**: PostgreSQL with Prisma ORM
- **Response Times**: 
  - First request: ~100-200ms
  - Cached requests: ~50-100ms
- **Auto-scaling**: Handled by Render.com

## 🔄 **Development Workflow**

1. **Frontend changes**: No backend changes needed for UI updates
2. **New features**: Backend is ready for additional endpoints
3. **Testing**: Use the health endpoint to verify backend status
4. **Monitoring**: Backend logs are available in Render dashboard

## 📞 **Support**

- **Backend Status**: Check `/health` endpoint
- **API Documentation**: Check root endpoint `/`
- **Issues**: Backend is production-ready with comprehensive error handling

---

**Last Updated**: October 28, 2025  
**Backend Version**: 1.0.0  
**Status**: ✅ Production Ready with Redis Caching
