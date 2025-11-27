/**
 * Утилиты для работы с местоположением через Telegram WebApp SDK
 */

interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Запрашивает местоположение пользователя через Telegram WebApp SDK
 * @returns Координаты или null, если пользователь отказал или произошла ошибка
 */
export async function requestLocation(): Promise<Location | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Пробуем использовать Telegram WebApp SDK
    const WebApp = (window as any).Telegram?.WebApp;
    
    if (!WebApp) {
      console.warn('[Location] Telegram WebApp SDK не доступен');
      return null;
    }

    // Проверяем, поддерживается ли запрос местоположения
    if (typeof WebApp.requestLocation !== 'function') {
      console.warn('[Location] Метод requestLocation не поддерживается');
      return null;
    }

    // Telegram WebApp.requestLocation принимает callback
    return new Promise<Location | null>((resolve) => {
      try {
        // Устанавливаем таймаут на случай, если callback никогда не вызовется
        const timeout = setTimeout(() => {
          console.warn('[Location] Таймаут при запросе местоположения');
          resolve(null);
        }, 10000); // 10 секунд

        WebApp.requestLocation((location: Location | null) => {
          clearTimeout(timeout);
          
          if (location && location.latitude && location.longitude) {
            console.log('[Location] Местоположение получено:', location);
            resolve(location);
          } else {
            console.log('[Location] Пользователь не предоставил местоположение');
            resolve(null);
          }
        });
      } catch (error) {
        console.error('[Location] Ошибка при запросе местоположения:', error);
        resolve(null);
      }
    });
  } catch (error) {
    console.error('[Location] Ошибка:', error);
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
