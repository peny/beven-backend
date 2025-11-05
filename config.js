// Configuration management
module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d'
  },

  // CORS configuration
  cors: {
    origin: ['http://localhost:19007', 'http://localhost:8082'],
    credentials: false, // No cookies, using Bearer tokens
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Allow any headers during development to avoid blocking browser-added headers
    allowedHeaders: ['*'],
    preflightContinue: false
  }
};
