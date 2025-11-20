import { getRedisClient } from '../config/redis';

// Префиксы для разных типов данных
const CACHE_PREFIXES = {
  RESTAURANTS: 'restaurants',
  RESTAURANT: 'restaurant',
  MENU: 'menu',
  BANNERS: 'banners',
} as const;

// Время жизни кэша (в секундах)
const CACHE_TTL = {
  RESTAURANTS: 3600, // 1 час
  RESTAURANT: 3600, // 1 час
  MENU: 1800, // 30 минут
  BANNERS: 1800, // 30 минут
} as const;

/**
 * Генерация ключа кэша
 */
const getCacheKey = (prefix: string, ...parts: (string | number | undefined)[]): string => {
  const validParts = parts.filter(p => p !== undefined && p !== null);
  return `${prefix}:${validParts.join(':')}`;
};

/**
 * Получить данные из кэша
 */
export const getFromCache = async <T>(key: string): Promise<T | null> => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error) {
    console.error(`❌ Ошибка при чтении из кэша (ключ: ${key}):`, error);
    return null;
  }
};

/**
 * Сохранить данные в кэш
 */
export const setToCache = async (key: string, value: any, ttl: number): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`❌ Ошибка при записи в кэш (ключ: ${key}):`, error);
  }
};

/**
 * Удалить данные из кэша
 */
export const deleteFromCache = async (key: string): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`❌ Ошибка при удалении из кэша (ключ: ${key}):`, error);
  }
};

/**
 * Удалить все ключи по паттерну
 */
export const deleteByPattern = async (pattern: string): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Удалено ${keys.length} ключей кэша по паттерну: ${pattern}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при удалении по паттерну (${pattern}):`, error);
  }
};

// ========== Специфичные функции для ресторанов ==========

export const getRestaurantsFromCache = async () => {
  const key = getCacheKey(CACHE_PREFIXES.RESTAURANTS, 'all');
  return getFromCache(key);
};

export const setRestaurantsToCache = async (data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.RESTAURANTS, 'all');
  await setToCache(key, data, CACHE_TTL.RESTAURANTS);
};

export const getRestaurantFromCache = async (id: string) => {
  const key = getCacheKey(CACHE_PREFIXES.RESTAURANT, id);
  return getFromCache(key);
};

export const setRestaurantToCache = async (id: string, data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.RESTAURANT, id);
  await setToCache(key, data, CACHE_TTL.RESTAURANT);
};

export const invalidateRestaurantsCache = async () => {
  await deleteByPattern(`${CACHE_PREFIXES.RESTAURANTS}:*`);
};

export const invalidateRestaurantCache = async (id: string) => {
  const key = getCacheKey(CACHE_PREFIXES.RESTAURANT, id);
  await deleteFromCache(key);
  // Также инвалидируем список всех ресторанов
  await invalidateRestaurantsCache();
};

// ========== Специфичные функции для меню ==========

export const getMenuFromCache = async (restaurantId: string) => {
  const key = getCacheKey(CACHE_PREFIXES.MENU, restaurantId);
  return getFromCache(key);
};

export const setMenuToCache = async (restaurantId: string, data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.MENU, restaurantId);
  await setToCache(key, data, CACHE_TTL.MENU);
};

export const invalidateMenuCache = async (restaurantId: string) => {
  const key = getCacheKey(CACHE_PREFIXES.MENU, restaurantId);
  await deleteFromCache(key);
};

export const invalidateAllMenuCache = async () => {
  await deleteByPattern(`${CACHE_PREFIXES.MENU}:*`);
};

// ========== Специфичные функции для баннеров ==========

export const getBannersFromCache = async (restaurantId?: string, type?: string) => {
  const key = getCacheKey(CACHE_PREFIXES.BANNERS, restaurantId || 'all', type || 'all');
  return getFromCache(key);
};

export const setBannersToCache = async (restaurantId: string | undefined, type: string | undefined, data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.BANNERS, restaurantId || 'all', type || 'all');
  await setToCache(key, data, CACHE_TTL.BANNERS);
};

export const invalidateBannersCache = async () => {
  await deleteByPattern(`${CACHE_PREFIXES.BANNERS}:*`);
};
