const { 
  generateCacheKey, 
  getCachedData, 
  setCachedData, 
  invalidateUserCache,
  clearAllCache,
  getCacheStats,
  getAllCacheKeys
} = require('../middleware/cache');

describe('Cache Security Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearAllCache();
  });

  afterAll(() => {
    clearAllCache();
  });

  describe('User Cache Isolation', () => {
    test('should generate different cache keys for different users', () => {
      const user1Id = 1;
      const user2Id = 2;
      const endpoint = 'budgets';

      const user1Key = generateCacheKey(user1Id, endpoint);
      const user2Key = generateCacheKey(user2Id, endpoint);

      expect(user1Key).toBe('user:1:budgets');
      expect(user2Key).toBe('user:2:budgets');
      expect(user1Key).not.toBe(user2Key);
    });

    test('should generate different cache keys for same user with different parameters', () => {
      const userId = 1;
      const endpoint = 'budgets';

      const key1 = generateCacheKey(userId, endpoint);
      const key2 = generateCacheKey(userId, endpoint, { limit: 10 });
      const key3 = generateCacheKey(userId, endpoint, { limit: 20 });
      const key4 = generateCacheKey(userId, endpoint, { sort: 'name' });

      expect(key1).toBe('user:1:budgets');
      expect(key2).toBe('user:1:budgets:limit=10');
      expect(key3).toBe('user:1:budgets:limit=20');
      expect(key4).toBe('user:1:budgets:sort=name');

      // All keys should be different
      const keys = [key1, key2, key3, key4];
      const uniqueKeys = [...new Set(keys)];
      expect(uniqueKeys).toHaveLength(keys.length);
    });

    test('should store and retrieve data separately for different users', () => {
      const user1Id = 1;
      const user2Id = 2;
      const endpoint = 'budgets';

      const user1Data = { budgets: [{ id: 1, name: 'User 1 Budget' }] };
      const user2Data = { budgets: [{ id: 2, name: 'User 2 Budget' }] };

      // Store data for both users
      setCachedData(user1Id, endpoint, user1Data);
      setCachedData(user2Id, endpoint, user2Data);

      // Retrieve data for both users
      const retrievedUser1Data = getCachedData(user1Id, endpoint);
      const retrievedUser2Data = getCachedData(user2Id, endpoint);

      expect(retrievedUser1Data).toEqual(user1Data);
      expect(retrievedUser2Data).toEqual(user2Data);
      expect(retrievedUser1Data).not.toEqual(retrievedUser2Data);
      expect(retrievedUser1Data.budgets[0].name).toBe('User 1 Budget');
      expect(retrievedUser2Data.budgets[0].name).toBe('User 2 Budget');
    });

    test('should never return same data for different users', () => {
      const user1Id = 1;
      const user2Id = 2;
      const endpoint = 'budgets';

      const user1Data = { budgets: [{ id: 1, name: 'User 1 Budget', amount: 1000 }] };
      const user2Data = { budgets: [{ id: 2, name: 'User 2 Budget', amount: 2000 }] };

      // Store different data for each user
      setCachedData(user1Id, endpoint, user1Data);
      setCachedData(user2Id, endpoint, user2Data);

      // Verify data isolation
      const retrievedUser1Data = getCachedData(user1Id, endpoint);
      const retrievedUser2Data = getCachedData(user2Id, endpoint);

      // Data should be completely different
      expect(retrievedUser1Data).not.toEqual(retrievedUser2Data);
      expect(retrievedUser1Data.budgets[0].id).not.toBe(retrievedUser2Data.budgets[0].id);
      expect(retrievedUser1Data.budgets[0].name).not.toBe(retrievedUser2Data.budgets[0].name);
      expect(retrievedUser1Data.budgets[0].amount).not.toBe(retrievedUser2Data.budgets[0].amount);
    });

    test('should invalidate cache only for specific user', () => {
      const user1Id = 1;
      const user2Id = 2;
      const endpoint = 'budgets';

      const user1Data = { budgets: [{ id: 1, name: 'User 1 Budget' }] };
      const user2Data = { budgets: [{ id: 2, name: 'User 2 Budget' }] };

      // Store data for both users
      setCachedData(user1Id, endpoint, user1Data);
      setCachedData(user2Id, endpoint, user2Data);

      // Verify both users have cached data
      expect(getCachedData(user1Id, endpoint)).toEqual(user1Data);
      expect(getCachedData(user2Id, endpoint)).toEqual(user2Data);

      // Invalidate only user 1's cache
      invalidateUserCache(user1Id, endpoint);

      // User 1's cache should be invalidated, user 2's should remain
      expect(getCachedData(user1Id, endpoint)).toBeUndefined();
      expect(getCachedData(user2Id, endpoint)).toEqual(user2Data);
    });

    test('should handle cache key generation with special characters safely', () => {
      const userId = 1;
      const endpoint = 'budgets';
      const params = {
        'sort': 'name',
        'filter': 'active',
        'limit': 10,
        'offset': 0
      };

      const key = generateCacheKey(userId, endpoint, params);
      
      // Key should be properly formatted and safe
      expect(key).toMatch(/^user:\d+:[a-zA-Z0-9\-_]+/);
      expect(key).not.toContain('..');
      expect(key).not.toContain('//');
      expect(key).not.toContain(' ');
      expect(key).toContain('user:1:budgets');
    });

    test('should maintain cache isolation with multiple endpoints', () => {
      const user1Id = 1;
      const user2Id = 2;

      // Store data for different endpoints
      setCachedData(user1Id, 'budgets', { budgets: [{ id: 1, name: 'User 1 Budget' }] });
      setCachedData(user1Id, 'categories', { categories: [{ id: 1, name: 'User 1 Category' }] });
      setCachedData(user2Id, 'budgets', { budgets: [{ id: 2, name: 'User 2 Budget' }] });
      setCachedData(user2Id, 'categories', { categories: [{ id: 2, name: 'User 2 Category' }] });

      // Verify isolation across endpoints
      const user1Budgets = getCachedData(user1Id, 'budgets');
      const user1Categories = getCachedData(user1Id, 'categories');
      const user2Budgets = getCachedData(user2Id, 'budgets');
      const user2Categories = getCachedData(user2Id, 'categories');

      expect(user1Budgets.budgets[0].name).toBe('User 1 Budget');
      expect(user1Categories.categories[0].name).toBe('User 1 Category');
      expect(user2Budgets.budgets[0].name).toBe('User 2 Budget');
      expect(user2Categories.categories[0].name).toBe('User 2 Category');

      // Verify no cross-contamination
      expect(user1Budgets).not.toEqual(user2Budgets);
      expect(user1Categories).not.toEqual(user2Categories);
    });

    test('should handle cache statistics correctly', () => {
      const user1Id = 1;
      const user2Id = 2;

      // Store some data
      setCachedData(user1Id, 'budgets', { data: 'user1' });
      setCachedData(user2Id, 'budgets', { data: 'user2' });
      setCachedData(user1Id, 'categories', { data: 'user1-categories' });

      // Get cache statistics
      const stats = getCacheStats();
      const allKeys = getAllCacheKeys();

      expect(stats.keys).toBe(3);
      expect(allKeys).toHaveLength(3);

      // Verify all keys are user-specific
      const user1Keys = allKeys.filter(key => key.includes(`user:${user1Id}:`));
      const user2Keys = allKeys.filter(key => key.includes(`user:${user2Id}:`));

      expect(user1Keys).toHaveLength(2);
      expect(user2Keys).toHaveLength(1);
      expect(user1Keys).not.toEqual(expect.arrayContaining(user2Keys));
    });

    test('should prevent cache key collisions with edge cases', () => {
      // Test with same user ID but different endpoints
      const userId = 1;
      const key1 = generateCacheKey(userId, 'budgets');
      const key2 = generateCacheKey(userId, 'budgets', {});
      const key3 = generateCacheKey(userId, 'budgets', { limit: undefined });

      expect(key1).toBe('user:1:budgets');
      expect(key2).toBe('user:1:budgets');
      expect(key3).toBe('user:1:budgets:limit=undefined');

      // Test with different users but same endpoint and params
      const user1Key = generateCacheKey(1, 'budgets', { limit: 10 });
      const user2Key = generateCacheKey(2, 'budgets', { limit: 10 });

      expect(user1Key).toBe('user:1:budgets:limit=10');
      expect(user2Key).toBe('user:2:budgets:limit=10');
      expect(user1Key).not.toBe(user2Key);
    });
  });

  describe('Cache Security Edge Cases', () => {
    test('should handle empty parameters safely', () => {
      const userId = 1;
      const endpoint = 'budgets';

      const key1 = generateCacheKey(userId, endpoint);
      const key2 = generateCacheKey(userId, endpoint, {});
      const key3 = generateCacheKey(userId, endpoint, null);
      const key4 = generateCacheKey(userId, endpoint, undefined);

      expect(key1).toBe('user:1:budgets');
      expect(key2).toBe('user:1:budgets');
      expect(key3).toBe('user:1:budgets');
      expect(key4).toBe('user:1:budgets');
    });

    test('should handle special characters in parameters', () => {
      const userId = 1;
      const endpoint = 'budgets';
      const params = {
        'filter': 'active & pending',
        'sort': 'name asc',
        'search': 'budget with "quotes"'
      };

      const key = generateCacheKey(userId, endpoint, params);
      
      // Key should be generated without errors
      expect(key).toBeDefined();
      expect(key).toContain('user:1:budgets');
      expect(key).toContain('filter=active & pending');
    });

    test('should clear all cache correctly', () => {
      // Store data for multiple users
      setCachedData(1, 'budgets', { data: 'user1' });
      setCachedData(2, 'budgets', { data: 'user2' });
      setCachedData(1, 'categories', { data: 'user1-categories' });

      // Verify data exists
      expect(getCacheStats().keys).toBe(3);

      // Clear all cache
      clearAllCache();

      // Verify cache is empty
      expect(getCacheStats().keys).toBe(0);
      expect(getAllCacheKeys()).toHaveLength(0);
    });
  });
});