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
    console.warn('[Location] Выполняется на сервере, пропускаем запрос местоположения');
    return null;
  }

  try {
    // Ждем, пока Telegram WebApp SDK будет готов
    // Иногда SDK загружается асинхронно
    let WebApp = (window as any).Telegram?.WebApp;
    
    // Если SDK еще не готов, ждем немного
    if (!WebApp) {
      console.log('[Location] Telegram WebApp SDK еще не готов, ждем...');
      await new Promise(resolve => setTimeout(resolve, 100));
      WebApp = (window as any).Telegram?.WebApp;
    }
    
    if (!WebApp) {
      console.warn('[Location] Telegram WebApp SDK не доступен после ожидания');
      return null;
    }

    // Убеждаемся, что WebApp готов
    if (typeof WebApp.ready === 'function') {
      WebApp.ready();
    }

    // Проверяем версию SDK (requestLocation доступен с версии 6.0+)
    const isVersionSupported = WebApp.isVersionAtLeast 
      ? WebApp.isVersionAtLeast('6.0')
      : false;

    if (!isVersionSupported) {
      console.warn('[Location] Версия Telegram WebApp SDK слишком старая. Требуется 6.0+');
      return null;
    }

    // Проверяем, поддерживается ли запрос местоположения
    if (typeof WebApp.requestLocation !== 'function') {
      console.warn('[Location] Метод requestLocation не поддерживается в этой версии Telegram');
      return null;
    }

    console.log('[Location] ✅ Запрашиваем местоположение пользователя через Telegram WebApp...');

    // Telegram WebApp.requestLocation принимает callback
    return new Promise<Location | null>((resolve) => {
      try {
        // Устанавливаем таймаут на случай, если callback никогда не вызовется
        const timeout = setTimeout(() => {
          console.warn('[Location] Таймаут при запросе местоположения (10 секунд)');
          resolve(null);
        }, 10000); // 10 секунд

        // Вызываем requestLocation с callback
        WebApp.requestLocation((location: Location | null) => {
          clearTimeout(timeout);
          
          if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
            console.log('[Location] Местоположение получено:', {
              latitude: location.latitude,
              longitude: location.longitude
            });
            resolve(location);
          } else {
            console.log('[Location] Пользователь не предоставил местоположение или данные некорректны');
            resolve(null);
          }
        });
      } catch (error) {
        console.error('[Location] Ошибка при запросе местоположения:', error);
        resolve(null);
      }
    });
  } catch (error) {
    console.error('[Location] Критическая ошибка:', error);
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
