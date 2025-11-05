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
  // Allow localhost origins in development and the deployed frontend in production by default.
  // You can override allowed origins via CORS_ORIGINs env var (comma-separated).
  get cors() {
    const isProd = (process.env.NODE_ENV === 'production');
    const defaultDev = ['http://localhost:19007', 'http://localhost:8082', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5173'];
    const defaultProd = ['https://beven-frontend.onrender.com'];
    const envList = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowList = (envList.length > 0) ? envList : (isProd ? defaultProd : defaulting(defaultDev));

    // Fastify-cors accepts a function for dynamic origin. Allow no-origin (e.g., curl),
    // and allow only whitelisted origins otherwise.
    const originFn = (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      // Not allowed origin
      return cb(new Error('CORS: origin not allowed'), false);
    };

    return {
      origin: originFn,
      credentials: false, // Using Bearer tokens; no cookies in this project
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      // Allow any request header; browsers will still require preflight for non-simple headers
      allowedHeaders: ['*'],
      preflightContinue: false
    };
  }
};

function defaulting(arr) { return Array.isArray(arr) ? arr : []; }
