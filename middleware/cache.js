const NodeCache = require('node-cache');

// Create cache instance with 10 minute TTL
const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects for better performance
});

/**
 * Generate user-specific cache key
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {object} params - Additional parameters
 * @returns {string} Cache key
 */
function generateCacheKey(userId, endpoint, params = {}) {
  // Handle null/undefined params
  if (!params || typeof params !== 'object') {
    params = {};
  }
  
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `user:${userId}:${endpoint}${paramString ? `:${paramString}` : ''}`;
}

/**
 * Get cached data for user
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {object} params - Additional parameters
 * @returns {any|null} Cached data or null
 */
function getCachedData(userId, endpoint, params = {}) {
  const key = generateCacheKey(userId, endpoint, params);
  return cache.get(key);
}

/**
 * Set cached data for user
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {any} data - Data to cache
 * @param {object} params - Additional parameters
 * @param {number} ttl - Time to live in seconds (optional)
 */
function setCachedData(userId, endpoint, data, params = {}, ttl = null) {
  const key = generateCacheKey(userId, endpoint, params);
  if (ttl) {
    cache.set(key, data, ttl);
  } else {
    cache.set(key, data);
  }
}

/**
 * Invalidate cache for specific user and endpoint
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint pattern (supports wildcards)
 */
function invalidateUserCache(userId, endpoint = null) {
  if (endpoint) {
    const pattern = `user:${userId}:${endpoint}*`;
    const keys = cache.keys().filter(key => key.match(pattern.replace('*', '.*')));
    cache.del(keys);
  } else {
    // Invalidate all cache for user
    const pattern = `user:${userId}:*`;
    const keys = cache.keys().filter(key => key.match(pattern.replace('*', '.*')));
    cache.del(keys);
  }
}

/**
 * Cache middleware for Fastify
 * @param {object} options - Cache options
 * @param {string} options.endpoint - Endpoint name
 * @param {number} options.ttl - Time to live in seconds
 * @param {function} options.keyGenerator - Custom key generator function
 */
function cacheMiddleware(options = {}) {
  return async function(request, reply) {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return;
    }

    // Skip caching if no user context
    if (!request.user || !request.user.id) {
      return;
    }

    const userId = request.user.id;
    const endpoint = options.endpoint || request.routerPath;
    const ttl = options.ttl || 600; // Default 10 minutes

    // Generate cache key
    let cacheKey;
    if (options.keyGenerator) {
      cacheKey = options.keyGenerator(request);
    } else {
      const params = {
        ...request.query,
        ...request.params
      };
      cacheKey = generateCacheKey(userId, endpoint, params);
    }

    // Try to get from cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      request.log.info(`Cache hit for user ${userId} on ${endpoint}`);
      return reply.send(cachedData);
    }

    // Store original send function
    const originalSend = reply.send.bind(reply);
    
    // Override send to cache the response
    reply.send = function(data) {
      // Only cache successful responses
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        request.log.info(`Caching response for user ${userId} on ${endpoint}`);
        cache.set(cacheKey, data, ttl);
      }
      return originalSend(data);
    };
  };
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.flushAll();
}

/**
 * Get cache statistics
 * @returns {object} Cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Get all cache keys (for debugging)
 * @returns {array} Array of cache keys
 */
function getAllCacheKeys() {
  return cache.keys();
}

module.exports = {
  generateCacheKey,
  getCachedData,
  setCachedData,
  invalidateUserCache,
  cacheMiddleware,
  clearAllCache,
  getCacheStats,
  getAllCacheKeys
};
