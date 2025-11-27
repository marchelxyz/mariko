import { getRedisClient } from '../config/redis';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';

// Префиксы для разных типов данных
const CACHE_PREFIXES = {
  RESTAURANTS: 'restaurants',
  RESTAURANT: 'restaurant',
  MENU: 'menu',
  BANNERS: 'banners',
  PAGE_HOME: 'page:home',
  PAGE_MENU: 'page:menu',
  REMARKED_TOKEN: 'remarked:token',
  USER: 'user',
} as const;

// Время жизни кэша (в секундах)
const CACHE_TTL = {
  RESTAURANTS: 3600, // 1 час
  RESTAURANT: 3600, // 1 час
  MENU: 1800, // 30 минут
  BANNERS: 1800, // 30 минут
  PAGE_HOME: 1800, // 30 минут
  PAGE_MENU: 1800, // 30 минут
  REMARKED_TOKEN: 3300, // 55 минут (токены ReMarked обычно валидны 1 час)
  USER: 300, // 5 минут (данные пользователя могут изменяться)
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
  return getFromCache<Restaurant>(key);
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

// ========== Специфичные функции для кэширования полных страниц ==========

/**
 * Получить кэшированные данные главной страницы
 */
export const getHomePageFromCache = async (restaurantId?: string) => {
  const key = getCacheKey(CACHE_PREFIXES.PAGE_HOME, restaurantId || 'default');
  return getFromCache(key);
};

/**
 * Сохранить данные главной страницы в кэш
 */
export const setHomePageToCache = async (restaurantId: string | undefined, data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.PAGE_HOME, restaurantId || 'default');
  await setToCache(key, data, CACHE_TTL.PAGE_HOME);
};

/**
 * Инвалидировать кэш главной страницы
 */
export const invalidateHomePageCache = async () => {
  await deleteByPattern(`${CACHE_PREFIXES.PAGE_HOME}:*`);
};

/**
 * Получить кэшированные данные страницы меню
 */
export const getMenuPageFromCache = async (restaurantId: string) => {
  const key = getCacheKey(CACHE_PREFIXES.PAGE_MENU, restaurantId);
  return getFromCache(key);
};

/**
 * Сохранить данные страницы меню в кэш
 */
export const setMenuPageToCache = async (restaurantId: string, data: any) => {
  const key = getCacheKey(CACHE_PREFIXES.PAGE_MENU, restaurantId);
  await setToCache(key, data, CACHE_TTL.PAGE_MENU);
};

/**
 * Инвалидировать кэш страницы меню для конкретного ресторана
 */
export const invalidateMenuPageCache = async (restaurantId: string) => {
  const key = getCacheKey(CACHE_PREFIXES.PAGE_MENU, restaurantId);
  await deleteFromCache(key);
};

/**
 * Инвалидировать кэш всех страниц меню
 */
export const invalidateAllMenuPageCache = async () => {
  await deleteByPattern(`${CACHE_PREFIXES.PAGE_MENU}:*`);
};

// ========== Специфичные функции для токенов ReMarked ==========

/**
 * Получить токен ReMarked из кэша
 */
export const getRemarkedTokenFromCache = async (pointId: number): Promise<string | null> => {
  const key = getCacheKey(CACHE_PREFIXES.REMARKED_TOKEN, String(pointId));
  return getFromCache<string>(key);
};

/**
 * Сохранить токен ReMarked в кэш
 */
export const setRemarkedTokenToCache = async (pointId: number, token: string): Promise<void> => {
  const key = getCacheKey(CACHE_PREFIXES.REMARKED_TOKEN, String(pointId));
  await setToCache(key, token, CACHE_TTL.REMARKED_TOKEN);
};

/**
 * Инвалидировать кэш токена ReMarked
 */
export const invalidateRemarkedTokenCache = async (pointId: number): Promise<void> => {
  const key = getCacheKey(CACHE_PREFIXES.REMARKED_TOKEN, String(pointId));
  await deleteFromCache(key);
};

// ========== Специфичные функции для пользователей ==========

/**
 * Получить данные пользователя из кэша
 */
export const getUserFromCache = async (userId: string) => {
  const key = getCacheKey(CACHE_PREFIXES.USER, userId);
  return getFromCache<User>(key);
};

/**
 * Сохранить данные пользователя в кэш
 */
export const setUserToCache = async (userId: string, data: any): Promise<void> => {
  const key = getCacheKey(CACHE_PREFIXES.USER, userId);
  await setToCache(key, data, CACHE_TTL.USER);
};

/**
 * Инвалидировать кэш пользователя
 */
export const invalidateUserCache = async (userId: string): Promise<void> => {
  const key = getCacheKey(CACHE_PREFIXES.USER, userId);
  await deleteFromCache(key);
};
