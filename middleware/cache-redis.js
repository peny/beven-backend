const redis = require('redis');
const NodeCache = require('node-cache');

// Configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
const USE_REDIS = !!REDIS_URL;

// Fallback in-memory cache
const fallbackCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Don't clone objects for better performance
});

// Redis client (will be initialized if Redis is available)
let redisClient = null;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  if (!USE_REDIS) {
    console.log('Redis not configured, using in-memory cache fallback');
    return false;
  }

  try {
    redisClient = redis.createClient({
      url: REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.log('Redis connection refused, falling back to in-memory cache');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.log('Redis retry time exhausted, falling back to in-memory cache');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          console.log('Redis max retries reached, falling back to in-memory cache');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      console.log('Redis Client Error:', err.message);
      redisClient = null; // Disable Redis on error
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.log('Failed to connect to Redis:', error.message);
    redisClient = null;
    return false;
  }
}

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
 * @returns {Promise<any|null>} Cached data or null
 */
async function getCachedData(userId, endpoint, params = {}) {
  const key = generateCacheKey(userId, endpoint, params);
  
  if (redisClient && redisClient.isOpen) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.log('Redis get error, falling back to in-memory:', error.message);
      return fallbackCache.get(key);
    }
  } else {
    return fallbackCache.get(key);
  }
}

/**
 * Set cached data for user
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 * @param {any} data - Data to cache
 * @param {object} params - Additional parameters
 * @param {number} ttl - Time to live in seconds (optional)
 */
async function setCachedData(userId, endpoint, data, params = {}, ttl = null) {
  const key = generateCacheKey(userId, endpoint, params);
  const ttlSeconds = ttl || 600; // Default 10 minutes
  
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      console.log('Redis set error, falling back to in-memory:', error.message);
      fallbackCache.set(key, data, ttlSeconds);
    }
  } else {
    fallbackCache.set(key, data, ttlSeconds);
  }
}

/**
 * Invalidate cache for specific user and endpoint
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint pattern (supports wildcards)
 */
async function invalidateUserCache(userId, endpoint = null) {
  const pattern = endpoint ? `user:${userId}:${endpoint}*` : `user:${userId}:*`;
  
  if (redisClient && redisClient.isOpen) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.log('Redis del error, falling back to in-memory:', error.message);
      // Fallback to in-memory cache invalidation
      const keys = fallbackCache.keys().filter(key => key.match(pattern.replace('*', '.*')));
      fallbackCache.del(keys);
    }
  } else {
    // In-memory cache invalidation
    const keys = fallbackCache.keys().filter(key => key.match(pattern.replace('*', '.*')));
    fallbackCache.del(keys);
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
    const cachedData = await getCachedData(userId, endpoint, {
      ...request.query,
      ...request.params
    });
    
    if (cachedData) {
      request.log.info(`Cache hit for user ${userId} (${request.user?.email || 'unknown'}) on ${endpoint}`);
      return reply.send(cachedData);
    }

    // Store original send function
    const originalSend = reply.send.bind(reply);
    
    // Override send to cache the response
    reply.send = async function(data) {
      // Only cache successful responses
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        request.log.info(`Caching response for user ${userId} (${request.user?.email || 'unknown'}) on ${endpoint}`);
        await setCachedData(userId, endpoint, data, {
          ...request.query,
          ...request.params
        }, ttl);
      }
      return originalSend(data);
    };
  };
}

/**
 * Clear all cache
 */
async function clearAllCache() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.flushAll();
    } catch (error) {
      console.log('Redis flush error, falling back to in-memory:', error.message);
      fallbackCache.flushAll();
    }
  } else {
    fallbackCache.flushAll();
  }
}

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache statistics
 */
async function getCacheStats() {
  if (redisClient && redisClient.isOpen) {
    try {
      const info = await redisClient.info('memory');
      const keys = await redisClient.dbSize();
      return {
        type: 'redis',
        keys: keys,
        memory: info
      };
    } catch (error) {
      console.log('Redis stats error, falling back to in-memory:', error.message);
      return {
        type: 'fallback',
        ...fallbackCache.getStats()
      };
    }
  } else {
    return {
      type: 'fallback',
      ...fallbackCache.getStats()
    };
  }
}

/**
 * Get all cache keys (for debugging)
 * @returns {Promise<array>} Array of cache keys
 */
async function getAllCacheKeys() {
  if (redisClient && redisClient.isOpen) {
    try {
      return await redisClient.keys('*');
    } catch (error) {
      console.log('Redis keys error, falling back to in-memory:', error.message);
      return fallbackCache.keys();
    }
  } else {
    return fallbackCache.keys();
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}

module.exports = {
  initializeRedis,
  generateCacheKey,
  getCachedData,
  setCachedData,
  invalidateUserCache,
  cacheMiddleware,
  clearAllCache,
  getCacheStats,
  getAllCacheKeys,
  closeRedis,
  USE_REDIS,
  redisClient: () => redisClient
};
