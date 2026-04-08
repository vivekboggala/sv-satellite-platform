import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheService = {
  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Cache set Error:', e);
    }
  },
  async get(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Cache get Error:', e);
      return null;
    }
  },
  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
        console.error('Cache remove Error:', e);
    }
  },
  async clear() {
      try {
          await AsyncStorage.clear();
      } catch (e) {
          console.error('Cache clear Error:', e);
      }
  }
};
export default cacheService;
