/**
 * Утилиты для работы с местоположением через Telegram WebApp SDK
 * 
 * Использует новый LocationManager API (Bot API 8.0+) с fallback на старый requestLocation (Bot API 6.0+)
 * для максимальной совместимости.
 */

interface Location {
  latitude: number;
  longitude: number;
  horizontalAccuracy?: number | null; // Точность в метрах (только для LocationManager)
}

interface LocationData {
  latitude: number;
  longitude: number;
  horizontalAccuracy: number | null;
}

interface LocationManager {
  isInitialized: boolean;
  isLocationAvailable: boolean;
  isPermissionRequested: boolean;
  isPermissionGranted: boolean;
  init(callback?: (success: boolean) => void): LocationManager;
  getLocation(callback: (locationData: LocationData | null) => void): LocationManager;
  openSettings(): LocationManager;
}

/**
 * Получает WebApp объект из различных источников
 */
function getWebApp(): any {
  if (typeof window === 'undefined') {
    return null;
  }

  // Пробуем получить через @twa-dev/sdk
  try {
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp) {
      return WebApp;
    }
  } catch (e) {
    // Игнорируем ошибки
  }

  return null;
}

/**
 * Инициализирует LocationManager (Bot API 8.0+)
 */
async function initLocationManager(WebApp: any): Promise<LocationManager | null> {
  if (!WebApp.LocationManager) {
    return null;
  }

  const locationManager = WebApp.LocationManager as LocationManager;

  // Если уже инициализирован, возвращаем сразу
  if (locationManager.isInitialized) {
    return locationManager;
  }

  // Инициализируем
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[Location] Таймаут инициализации LocationManager');
      resolve(null);
    }, 5000);

    locationManager.init((success) => {
      clearTimeout(timeout);
      if (success) {
        console.log('[Location] LocationManager успешно инициализирован');
        resolve(locationManager);
      } else {
        console.warn('[Location] Не удалось инициализировать LocationManager');
        resolve(null);
      }
    });
  });
}

/**
 * Запрашивает местоположение через новый LocationManager API (Bot API 8.0+)
 */
async function requestLocationViaLocationManager(WebApp: any): Promise<Location | null> {
  if (!WebApp.isVersionAtLeast || !WebApp.isVersionAtLeast('8.0')) {
    return null;
  }

  const locationManager = await initLocationManager(WebApp);
  if (!locationManager) {
    return null;
  }

  // Проверяем доступность геолокации
  if (!locationManager.isLocationAvailable) {
    console.warn('[Location] Геолокация недоступна на этом устройстве');
    return null;
  }

  // Проверяем разрешение
  if (!locationManager.isPermissionGranted) {
    console.log('[Location] Разрешение на геолокацию не предоставлено');
    // Примечание: openSettings() можно вызвать только в ответ на действие пользователя
    // Здесь мы просто возвращаем null, вызывающий код может показать кнопку для запроса разрешения
    return null;
  }

  console.log('[Location] ✅ Запрашиваем местоположение через LocationManager...');

  return new Promise<Location | null>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[Location] Таймаут при запросе местоположения через LocationManager (10 секунд)');
      resolve(null);
    }, 10000);

    try {
      locationManager.getLocation((locationData) => {
        clearTimeout(timeout);

        if (locationData && typeof locationData.latitude === 'number' && typeof locationData.longitude === 'number') {
          console.log('[Location] Местоположение получено через LocationManager:', {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.horizontalAccuracy
          });
          resolve({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            horizontalAccuracy: locationData.horizontalAccuracy
          });
        } else {
          console.log('[Location] Пользователь не предоставил местоположение через LocationManager');
          resolve(null);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('[Location] Ошибка при запросе местоположения через LocationManager:', error);
      resolve(null);
    }
  });
}

/**
 * Запрашивает местоположение через старый requestLocation API (Bot API 6.0+)
 * Используется как fallback для старых версий Telegram
 */
async function requestLocationViaLegacyAPI(WebApp: any): Promise<Location | null> {
  // Проверяем версию SDK (requestLocation доступен с версии 6.0+)
  const isVersionSupported = WebApp.isVersionAtLeast 
    ? WebApp.isVersionAtLeast('6.0')
    : false;

  if (!isVersionSupported) {
    return null;
  }

  // Проверяем, поддерживается ли запрос местоположения
  if (typeof WebApp.requestLocation !== 'function') {
    return null;
  }

  console.log('[Location] ✅ Запрашиваем местоположение через старый API (requestLocation)...');

  return new Promise<Location | null>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[Location] Таймаут при запросе местоположения через старый API (10 секунд)');
      resolve(null);
    }, 10000);

    try {
      WebApp.requestLocation((location: Location | null) => {
        clearTimeout(timeout);

        if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
          console.log('[Location] Местоположение получено через старый API:', {
            latitude: location.latitude,
            longitude: location.longitude
          });
          resolve(location);
        } else {
          console.log('[Location] Пользователь не предоставил местоположение через старый API');
          resolve(null);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('[Location] Ошибка при запросе местоположения через старый API:', error);
      resolve(null);
    }
  });
}

/**
 * Запрашивает местоположение пользователя через Telegram WebApp SDK
 * 
 * Использует новый LocationManager API (Bot API 8.0+) с fallback на старый requestLocation (Bot API 6.0+)
 * 
 * @returns Координаты или null, если пользователь отказал или произошла ошибка
 */
export async function requestLocation(): Promise<Location | null> {
  if (typeof window === 'undefined') {
    console.warn('[Location] Выполняется на сервере, пропускаем запрос местоположения');
    return null;
  }

  try {
    // Ждем, пока Telegram WebApp SDK будет готов
    // Иногда SDK загружается асинхронно
    let WebApp = getWebApp();
    
    // Если SDK еще не готов, ждем немного
    if (!WebApp) {
      console.log('[Location] Telegram WebApp SDK еще не готов, ждем...');
      await new Promise(resolve => setTimeout(resolve, 100));
      WebApp = getWebApp();
    }
    
    if (!WebApp) {
      console.warn('[Location] Telegram WebApp SDK не доступен после ожидания');
      return null;
    }

    // Убеждаемся, что WebApp готов
    if (typeof WebApp.ready === 'function') {
      WebApp.ready();
    }

    // Пробуем использовать новый LocationManager API (Bot API 8.0+)
    const locationViaNewAPI = await requestLocationViaLocationManager(WebApp);
    if (locationViaNewAPI) {
      return locationViaNewAPI;
    }

    // Fallback на старый API (Bot API 6.0+)
    console.log('[Location] Пробуем использовать старый API как fallback...');
    const locationViaOldAPI = await requestLocationViaLegacyAPI(WebApp);
    if (locationViaOldAPI) {
      return locationViaOldAPI;
    }

    console.warn('[Location] Не удалось получить местоположение ни через новый, ни через старый API');
    return null;
  } catch (error) {
    console.error('[Location] Критическая ошибка:', error);
    return null;
  }
}

/**
 * Открывает настройки для запроса разрешения на геолокацию
 * 
 * ВАЖНО: Этот метод можно вызвать только в ответ на действие пользователя
 * (например, клик по кнопке внутри Mini App)
 * 
 * @returns true если настройки были открыты, false если метод недоступен
 */
export async function openLocationSettings(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const WebApp = getWebApp();
    if (!WebApp) {
      return false;
    }

    // Проверяем поддержку LocationManager (Bot API 8.0+)
    if (WebApp.isVersionAtLeast && WebApp.isVersionAtLeast('8.0') && WebApp.LocationManager) {
      const locationManager = await initLocationManager(WebApp);
      if (locationManager) {
        try {
          locationManager.openSettings();
          console.log('[Location] Настройки геолокации открыты');
          return true;
        } catch (error) {
          console.error('[Location] Ошибка при открытии настроек:', error);
          return false;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[Location] Ошибка при попытке открыть настройки:', error);
    return false;
  }
}

/**
 * Проверяет, предоставлено ли разрешение на геолокацию
 * 
 * @returns объект с информацией о статусе разрешений или null если API недоступен
 */
export async function checkLocationPermission(): Promise<{
  isLocationAvailable: boolean;
  isPermissionRequested: boolean;
  isPermissionGranted: boolean;
} | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const WebApp = getWebApp();
    if (!WebApp) {
      return null;
    }

    // Проверяем поддержку LocationManager (Bot API 8.0+)
    if (WebApp.isVersionAtLeast && WebApp.isVersionAtLeast('8.0') && WebApp.LocationManager) {
      const locationManager = await initLocationManager(WebApp);
      if (locationManager) {
        return {
          isLocationAvailable: locationManager.isLocationAvailable,
          isPermissionRequested: locationManager.isPermissionRequested,
          isPermissionGranted: locationManager.isPermissionGranted
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Location] Ошибка при проверке разрешений:', error);
    return null;
  }
}

/**
 * Получает сохраненное местоположение из localStorage
 */
export function getStoredLocation(): Location | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem('user_location');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Location] Ошибка при чтении сохраненного местоположения:', error);
  }

  return null;
}

/**
 * Сохраняет местоположение в localStorage
 */
export function storeLocation(location: Location): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('user_location', JSON.stringify(location));
  } catch (error) {
    console.error('[Location] Ошибка при сохранении местоположения:', error);
  }
}
