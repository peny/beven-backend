const NodeCache = require('node-cache');

// Rate limiting cache (5 minute TTL)
const rateLimitCache = new NodeCache({ stdTTL: 300 });

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {number} options.windowMs - Window size in milliseconds
 * @returns {Function} Middleware function
 */
function rateLimit(options = {}) {
  const { maxRequests = 100, windowMs = 60000 } = options; // Default: 100 requests per minute

  return async (request, reply) => {
    const clientId = request.user?.id || request.ip;
    const key = `rate_limit:${clientId}`;
    
    const current = rateLimitCache.get(key) || { count: 0, resetTime: Date.now() + windowMs };
    
    // Reset if window expired
    if (Date.now() > current.resetTime) {
      current.count = 0;
      current.resetTime = Date.now() + windowMs;
    }
    
    // Check if limit exceeded
    if (current.count >= maxRequests) {
      reply.code(429);
      return {
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((current.resetTime - Date.now()) / 1000)
      };
    }
    
    // Increment counter
    current.count++;
    rateLimitCache.set(key, current);
    
    // Add headers
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count));
    reply.header('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
  };
}

/**
 * Request validation middleware
 * @param {Object} schema - JSON schema for validation
 * @returns {Function} Middleware function
 */
function validateRequest(schema) {
  return async (request, reply) => {
    try {
      // Validate request body
      if (schema.body && request.body) {
        const { error } = fastify.getSchemaCompiler(schema.body)(request.body);
        if (error) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid request body',
            details: error.errors
          };
        }
      }

      // Validate query parameters
      if (schema.querystring && request.query) {
        const { error } = fastify.getSchemaCompiler(schema.querystring)(request.query);
        if (error) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid query parameters',
            details: error.errors
          };
        }
      }

      // Validate path parameters
      if (schema.params && request.params) {
        const { error } = fastify.getSchemaCompiler(schema.params)(request.params);
        if (error) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid path parameters',
            details: error.errors
          };
        }
      }
    } catch (error) {
      fastify.log.error('Validation middleware error:', error);
      reply.code(500);
      return {
        success: false,
        error: 'Validation error'
      };
    }
  };
}

/**
 * Request logging middleware
 * @param {Object} options - Logging options
 * @returns {Function} Middleware function
 */
function requestLogger(options = {}) {
  const { logBody = false, logHeaders = false } = options;

  return async (request, reply) => {
    const startTime = Date.now();
    
    // Log request
    const logData = {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.id
    };

    if (logHeaders) {
      logData.headers = request.headers;
    }

    if (logBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      logData.body = request.body;
    }

    fastify.log.info('Request received:', logData);

    // Log response
    reply.addHook('onSend', (request, reply, payload, done) => {
      const duration = Date.now() - startTime;
      
      fastify.log.info('Response sent:', {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
        userId: request.user?.id
      });
      
      done();
    });
  };
}

/**
 * Security headers middleware
 * @returns {Function} Middleware function
 */
function securityHeaders() {
  return async (request, reply) => {
    // Add security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add CORS headers for API
    if (request.url.startsWith('/api/')) {
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  };
}

/**
 * Error handling middleware
 * @returns {Function} Middleware function
 */
function errorHandler() {
  return async (error, request, reply) => {
    fastify.log.error('Unhandled error:', error);

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    reply.code(error.statusCode || 500);
    return {
      success: false,
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack })
    };
  };
}

/**
 * Request sanitization middleware
 * @returns {Function} Middleware function
 */
function sanitizeRequest() {
  return async (request, reply) => {
    // Sanitize string inputs
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.trim().replace(/[<>]/g, '');
    };

    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'string' ? sanitizeString(item) : 
            typeof item === 'object' ? sanitizeObject(item) : item
          );
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    // Sanitize request body
    if (request.body) {
      request.body = sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query) {
      request.query = sanitizeObject(request.query);
    }
  };
}

module.exports = {
  rateLimit,
  validateRequest,
  requestLogger,
  securityHeaders,
  errorHandler,
  sanitizeRequest
};
