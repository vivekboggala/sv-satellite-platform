import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
    USER_DATA: 'cache_user_data',
    TRANSACTIONS: 'cache_transactions',
    PAYMENTS: 'cache_payments',
    NOTIFICATIONS: 'cache_notifications',
    PLANS: 'cache_plans',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Save data to cache with timestamp
 */
export const saveToCache = async (key, data) => {
    try {
        const cacheData = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(cacheData));
        console.log(`✅ Cached: ${key}`);
    } catch (error) {
        console.error(`❌ Cache save failed for ${key}:`, error);
    }
};

/**
 * Get data from cache if not expired
 */
export const getFromCache = async (key) => {
    try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (isExpired) {
            await AsyncStorage.removeItem(key);
            console.log(`⏰ Cache expired: ${key}`);
            return null;
        }

        console.log(`✅ Cache hit: ${key}`);
        return data;
    } catch (error) {
        console.error(`❌ Cache read failed for ${key}:`, error);
        return null;
    }
};

/**
 * Clear specific cache
 */
export const clearCache = async (key) => {
    try {
        await AsyncStorage.removeItem(key);
        console.log(`🗑️ Cleared cache: ${key}`);
    } catch (error) {
        console.error(`❌ Cache clear failed for ${key}:`, error);
    }
};

/**
 * Clear all caches
 */
export const clearAllCaches = async () => {
    try {
        const keys = Object.values(CACHE_KEYS);
        await AsyncStorage.multiRemove(keys);
        console.log('🗑️ All caches cleared');
    } catch (error) {
        console.error('❌ Clear all caches failed:', error);
    }
};

export { CACHE_KEYS };
