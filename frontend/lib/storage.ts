/**
 * Утилиты для работы с Telegram DeviceStorage и SecureStorage
 * DeviceStorage: до 5 МБ на пользователя (для обычных данных)
 * SecureStorage: до 10 элементов (для чувствительных данных)
 */

type StorageCallback<T> = (error: string | null, value?: T, canRestore?: boolean) => void;
type SimpleCallback = (error: string | null, success?: boolean) => void;

interface TelegramWebApp {
  DeviceStorage?: {
    setItem: (key: string, value: string, callback?: SimpleCallback) => DeviceStorage;
    getItem: (key: string, callback: StorageCallback<string>) => DeviceStorage;
    removeItem: (key: string, callback?: SimpleCallback) => DeviceStorage;
    clear: (callback?: SimpleCallback) => DeviceStorage;
  };
  SecureStorage?: {
    setItem: (key: string, value: string, callback?: SimpleCallback) => SecureStorage;
    getItem: (key: string, callback: StorageCallback<string>) => SecureStorage;
    restoreItem: (key: string, callback?: StorageCallback<string>) => SecureStorage;
    removeItem: (key: string, callback?: SimpleCallback) => SecureStorage;
    clear: (callback?: SimpleCallback) => SecureStorage;
  };
  isVersionAtLeast?: (version: string) => boolean;
}

interface DeviceStorage {
  setItem: (key: string, value: string, callback?: SimpleCallback) => DeviceStorage;
  getItem: (key: string, callback: StorageCallback<string>) => DeviceStorage;
  removeItem: (key: string, callback?: SimpleCallback) => DeviceStorage;
  clear: (callback?: SimpleCallback) => DeviceStorage;
}

interface SecureStorage {
  setItem: (key: string, value: string, callback?: SimpleCallback) => SecureStorage;
  getItem: (key: string, callback: StorageCallback<string>) => SecureStorage;
  restoreItem: (key: string, callback?: StorageCallback<string>) => SecureStorage;
  removeItem: (key: string, callback?: SimpleCallback) => SecureStorage;
  clear: (callback?: SimpleCallback) => SecureStorage;
}

/**
 * Получает объект Telegram WebApp
 */
const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  
  // Пробуем через SDK
  try {
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp) return WebApp;
  } catch (e) {
    // Игнорируем ошибку
  }
  
  return null;
};

/**
 * Проверяет, доступен ли DeviceStorage (Bot API 9.0+)
 */
export const isDeviceStorageAvailable = (): boolean => {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  
  // Проверяем версию API
  if (webApp.isVersionAtLeast && webApp.isVersionAtLeast('9.0')) {
    return !!webApp.DeviceStorage;
  }
  
  return false;
};

/**
 * Проверяет, доступен ли SecureStorage (Bot API 9.0+)
 */
export const isSecureStorageAvailable = (): boolean => {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  
  // Проверяем версию API
  if (webApp.isVersionAtLeast && webApp.isVersionAtLeast('9.0')) {
    return !!webApp.SecureStorage;
  }
  
  return false;
};

/**
 * DeviceStorage - для обычных данных (до 5 МБ)
 */
export const deviceStorage = {
  /**
   * Сохраняет значение в DeviceStorage
   */
  setItem: async (key: string, value: string): Promise<boolean> => {
    if (!isDeviceStorageAvailable()) {
      // Fallback на localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`device_${key}`, value);
          return true;
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
          return false;
        }
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.DeviceStorage) return false;

    return new Promise((resolve) => {
      webApp.DeviceStorage!.setItem(key, value, (error) => {
        if (error) {
          console.error(`Failed to save to DeviceStorage (${key}):`, error);
          // Fallback на localStorage
          try {
            localStorage.setItem(`device_${key}`, value);
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        } else {
          resolve(true);
        }
      });
    });
  },

  /**
   * Получает значение из DeviceStorage
   */
  getItem: async (key: string): Promise<string | null> => {
    if (!isDeviceStorageAvailable()) {
      // Fallback на localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`device_${key}`);
      }
      return null;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.DeviceStorage) return null;

    return new Promise((resolve) => {
      webApp.DeviceStorage!.getItem(key, (error, value) => {
        if (error) {
          console.error(`Failed to read from DeviceStorage (${key}):`, error);
          // Fallback на localStorage
          const fallbackValue = typeof window !== 'undefined' 
            ? localStorage.getItem(`device_${key}`) 
            : null;
          resolve(fallbackValue);
        } else {
          resolve(value || null);
        }
      });
    });
  },

  /**
   * Удаляет значение из DeviceStorage
   */
  removeItem: async (key: string): Promise<boolean> => {
    if (!isDeviceStorageAvailable()) {
      // Fallback на localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`device_${key}`);
        return true;
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.DeviceStorage) return false;

    return new Promise((resolve) => {
      webApp.DeviceStorage!.removeItem(key, (error) => {
        if (error) {
          console.error(`Failed to remove from DeviceStorage (${key}):`, error);
          resolve(false);
        } else {
          // Также удаляем из localStorage fallback
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`device_${key}`);
          }
          resolve(true);
        }
      });
    });
  },

  /**
   * Очищает все данные из DeviceStorage
   */
  clear: async (): Promise<boolean> => {
    if (!isDeviceStorageAvailable()) {
      // Fallback на localStorage - удаляем только наши ключи
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('device_')) {
            localStorage.removeItem(key);
          }
        });
        return true;
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.DeviceStorage) return false;

    return new Promise((resolve) => {
      webApp.DeviceStorage!.clear((error) => {
        if (error) {
          console.error('Failed to clear DeviceStorage:', error);
          resolve(false);
        } else {
          // Также очищаем localStorage fallback
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('device_')) {
                localStorage.removeItem(key);
              }
            });
          }
          resolve(true);
        }
      });
    });
  },
};

/**
 * SecureStorage - для чувствительных данных (до 10 элементов)
 */
export const secureStorage = {
  /**
   * Сохраняет значение в SecureStorage
   */
  setItem: async (key: string, value: string): Promise<boolean> => {
    if (!isSecureStorageAvailable()) {
      // Fallback на localStorage (менее безопасно, но лучше чем ничего)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`secure_${key}`, value);
          return true;
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
          return false;
        }
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.SecureStorage) return false;

    return new Promise((resolve) => {
      webApp.SecureStorage!.setItem(key, value, (error) => {
        if (error) {
          console.error(`Failed to save to SecureStorage (${key}):`, error);
          // Fallback на localStorage
          try {
            localStorage.setItem(`secure_${key}`, value);
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        } else {
          resolve(true);
        }
      });
    });
  },

  /**
   * Получает значение из SecureStorage
   */
  getItem: async (key: string): Promise<string | null> => {
    if (!isSecureStorageAvailable()) {
      // Fallback на localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`secure_${key}`);
      }
      return null;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.SecureStorage) return null;

    return new Promise((resolve) => {
      webApp.SecureStorage!.getItem(key, (error, value, canRestore) => {
        if (error) {
          console.error(`Failed to read from SecureStorage (${key}):`, error);
          // Fallback на localStorage
          const fallbackValue = typeof window !== 'undefined' 
            ? localStorage.getItem(`secure_${key}`) 
            : null;
          resolve(fallbackValue);
        } else if (value === null && canRestore) {
          // Значение можно восстановить, но пока null
          resolve(null);
        } else {
          resolve(value || null);
        }
      });
    });
  },

  /**
   * Восстанавливает значение из SecureStorage
   */
  restoreItem: async (key: string): Promise<string | null> => {
    if (!isSecureStorageAvailable()) {
      return null;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.SecureStorage) return null;

    return new Promise((resolve) => {
      webApp.SecureStorage!.restoreItem(key, (error, value) => {
        if (error) {
          console.error(`Failed to restore from SecureStorage (${key}):`, error);
          resolve(null);
        } else {
          resolve(value || null);
        }
      });
    });
  },

  /**
   * Удаляет значение из SecureStorage
   */
  removeItem: async (key: string): Promise<boolean> => {
    if (!isSecureStorageAvailable()) {
      // Fallback на localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`secure_${key}`);
        return true;
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.SecureStorage) return false;

    return new Promise((resolve) => {
      webApp.SecureStorage!.removeItem(key, (error) => {
        if (error) {
          console.error(`Failed to remove from SecureStorage (${key}):`, error);
          resolve(false);
        } else {
          // Также удаляем из localStorage fallback
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`secure_${key}`);
          }
          resolve(true);
        }
      });
    });
  },

  /**
   * Очищает все данные из SecureStorage
   */
  clear: async (): Promise<boolean> => {
    if (!isSecureStorageAvailable()) {
      // Fallback на localStorage - удаляем только наши ключи
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('secure_')) {
            localStorage.removeItem(key);
          }
        });
        return true;
      }
      return false;
    }

    const webApp = getTelegramWebApp();
    if (!webApp?.SecureStorage) return false;

    return new Promise((resolve) => {
      webApp.SecureStorage!.clear((error) => {
        if (error) {
          console.error('Failed to clear SecureStorage:', error);
          resolve(false);
        } else {
          // Также очищаем localStorage fallback
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('secure_')) {
                localStorage.removeItem(key);
              }
            });
          }
          resolve(true);
        }
      });
    });
  },
};

/**
 * Ключи для хранения данных
 */
export const STORAGE_KEYS = {
  // SecureStorage (чувствительные данные)
  TOKEN: 'auth_token',
  USER_ID: 'user_id',
  
  // DeviceStorage (обычные данные)
  RESTAURANTS: 'restaurants',
  RESTAURANTS_TIMESTAMP: 'restaurants_timestamp',
  SELECTED_RESTAURANT_ID: 'selected_restaurant_id',
  FAVORITE_RESTAURANT_ID: 'favorite_restaurant_id',
  BANNERS_PREFIX: 'banners_', // banners_{restaurantId}
  BANNERS_TIMESTAMP_PREFIX: 'banners_timestamp_', // banners_timestamp_{restaurantId}
  USER_PROFILE: 'user_profile',
  USER_PROFILE_TIMESTAMP: 'user_profile_timestamp',
} as const;

/**
 * Вспомогательные функции для работы с JSON
 */
export const storageHelpers = {
  /**
   * Сохраняет объект как JSON
   */
  setJSON: async <T>(
    storage: typeof deviceStorage | typeof secureStorage,
    key: string,
    value: T
  ): Promise<boolean> => {
    try {
      const json = JSON.stringify(value);
      return await storage.setItem(key, json);
    } catch (error) {
      console.error(`Failed to serialize JSON for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Получает объект из JSON
   */
  getJSON: async <T>(
    storage: typeof deviceStorage | typeof secureStorage,
    key: string
  ): Promise<T | null> => {
    try {
      const json = await storage.getItem(key);
      if (!json) return null;
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  },
};
