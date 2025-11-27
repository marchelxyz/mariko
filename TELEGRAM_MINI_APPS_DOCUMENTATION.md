# Документация Telegram Mini Apps - Полный анализ

## Оглавление
1. [Обзор Telegram Mini Apps](#обзор)
2. [Инициализация Mini Apps](#инициализация)
3. [Работа с геолокацией](#геолокация)
4. [Другие важные возможности](#другие-возможности)
5. [Рекомендации по использованию](#рекомендации)

---

## Обзор

Telegram Mini Apps позволяют создавать полнофункциональные веб-приложения, которые запускаются прямо внутри Telegram. Они поддерживают:

- **Seamless авторизацию** - автоматическая авторизация через Telegram
- **Платежи** - интеграция с платежными системами (Google Pay, Apple Pay)
- **Push-уведомления** - персонализированные уведомления пользователям
- **Геолокацию** - доступ к местоположению пользователя
- **Хранилище данных** - DeviceStorage и SecureStorage
- **Полноэкранный режим** - поддержка landscape и portrait режимов

---

## Инициализация

### Базовый пример

```typescript
import WebApp from '@twa-dev/sdk';

// Инициализация WebApp
WebApp.ready();

// Получение данных пользователя
const user = WebApp.initDataUnsafe?.user;
const initData = WebApp.initData;
```

### Важные поля WebApp

- `initData` - строка с данными инициализации для проверки на сервере
- `initDataUnsafe` - объект с данными пользователя (без проверки подписи)
- `version` - версия Bot API
- `platform` - платформа (ios, android, web, etc.)
- `colorScheme` - цветовая схема (light/dark)
- `themeParams` - параметры темы Telegram
- `viewportHeight` - высота viewport
- `viewportStableHeight` - стабильная высота viewport (без клавиатуры)
- `isExpanded` - развернуто ли приложение
- `isFullscreen` - полноэкранный режим (Bot API 8.0+)
- `isActive` - активно ли приложение (Bot API 8.0+)

### Проверка версии API

```typescript
// Проверка поддержки конкретной версии
if (WebApp.isVersionAtLeast('8.0')) {
  // Используем функции Bot API 8.0+
}
```

---

## Геолокация

### Bot API 6.0+ (Устаревший метод)

Старый метод `requestLocation` доступен с Bot API 6.0, но **не рекомендуется** к использованию:

```typescript
// УСТАРЕВШИЙ СПОСОБ - не рекомендуется
WebApp.requestLocation((location) => {
  if (location) {
    console.log(location.latitude, location.longitude);
  }
});
```

**Проблемы старого метода:**
- Нет контроля над разрешениями
- Нет информации о точности
- Нет возможности отслеживать изменения статуса разрешений
- Менее гибкий API

### Bot API 8.0+ (Рекомендуемый метод - LocationManager)

Новый `LocationManager` API предоставляет полный контроль над геолокацией:

#### Инициализация LocationManager

```typescript
const locationManager = WebApp.LocationManager;

// Инициализация перед использованием
locationManager.init((success) => {
  if (success) {
    console.log('LocationManager готов к использованию');
  }
});
```

#### Проверка доступности и разрешений

```typescript
// Проверка доступности геолокации на устройстве
if (!locationManager.isLocationAvailable) {
  console.log('Геолокация недоступна на этом устройстве');
  return;
}

// Проверка, запрашивалось ли разрешение
if (!locationManager.isPermissionRequested) {
  console.log('Разрешение еще не запрашивалось');
}

// Проверка, предоставлено ли разрешение
if (!locationManager.isPermissionGranted) {
  console.log('Разрешение не предоставлено');
  // Можно открыть настройки для запроса разрешения
  locationManager.openSettings();
}
```

#### Получение местоположения

```typescript
locationManager.getLocation((locationData) => {
  if (locationData) {
    console.log('Широта:', locationData.latitude);
    console.log('Долгота:', locationData.longitude);
    console.log('Точность:', locationData.horizontalAccuracy, 'метров');
  } else {
    console.log('Доступ к геолокации не предоставлен');
  }
});
```

#### Структура LocationData

```typescript
interface LocationData {
  latitude: number;        // Широта в градусах
  longitude: number;       // Долгота в градусах
  horizontalAccuracy: number | null; // Точность в метрах (null если недоступна)
}
```

#### События LocationManager

```typescript
// Событие при изменении состояния LocationManager
WebApp.onEvent('locationManagerUpdated', () => {
  console.log('Состояние LocationManager изменилось');
  console.log('Разрешение предоставлено:', locationManager.isPermissionGranted);
});

// Событие при запросе местоположения
WebApp.onEvent('locationRequested', (event) => {
  const locationData = event.locationData;
  if (locationData) {
    console.log('Местоположение получено:', locationData);
  }
});
```

#### Полный пример использования

```typescript
import WebApp from '@twa-dev/sdk';

async function getCurrentLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    const locationManager = WebApp.LocationManager;
    
    // Проверяем доступность
    if (!locationManager.isLocationAvailable) {
      console.warn('Геолокация недоступна');
      resolve(null);
      return;
    }
    
    // Инициализируем, если еще не инициализирован
    if (!locationManager.isInitialized) {
      locationManager.init((success) => {
        if (!success) {
          console.error('Не удалось инициализировать LocationManager');
          resolve(null);
          return;
        }
        requestLocation();
      });
    } else {
      requestLocation();
    }
    
    function requestLocation() {
      // Проверяем разрешение
      if (!locationManager.isPermissionGranted) {
        // Открываем настройки для запроса разрешения
        // Можно вызвать только в ответ на действие пользователя
        locationManager.openSettings();
        resolve(null);
        return;
      }
      
      // Запрашиваем местоположение
      locationManager.getLocation((locationData) => {
        resolve(locationData);
      });
    }
  });
}
```

---

## Другие важные возможности

### Полноэкранный режим (Bot API 8.0+)

```typescript
// Запрос полноэкранного режима
if (WebApp.isVersionAtLeast('8.0')) {
  if (!WebApp.isFullscreen) {
    WebApp.requestFullscreen();
  }
}

// Выход из полноэкранного режима
WebApp.exitFullscreen();

// События
WebApp.onEvent('fullscreenChanged', () => {
  console.log('Полноэкранный режим:', WebApp.isFullscreen);
});

WebApp.onEvent('fullscreenFailed', () => {
  console.error('Не удалось перейти в полноэкранный режим');
});
```

### Safe Area (Bot API 8.0+)

```typescript
// Отступы безопасной области
const safeArea = WebApp.safeAreaInset;
console.log('Top:', safeArea.top);
console.log('Bottom:', safeArea.bottom);
console.log('Left:', safeArea.left);
console.log('Right:', safeArea.right);

// Отступы контента
const contentSafeArea = WebApp.contentSafeAreaInset;

// События изменения safe area
WebApp.onEvent('safeAreaChanged', () => {
  // Обновить layout
});

WebApp.onEvent('contentSafeAreaChanged', () => {
  // Обновить layout контента
});
```

### DeviceStorage и SecureStorage (Bot API 9.0+)

```typescript
// DeviceStorage - обычное хранилище
const deviceStorage = WebApp.DeviceStorage;
deviceStorage.setItem('key', 'value', (success) => {
  if (success) {
    deviceStorage.getItem('key', (value) => {
      console.log('Значение:', value);
    });
  }
});

// SecureStorage - безопасное хранилище для токенов и паролей
const secureStorage = WebApp.SecureStorage;
secureStorage.setItem('token', 'secret_token', (success) => {
  if (success) {
    secureStorage.getItem('token', (token) => {
      console.log('Токен:', token);
    });
  }
});
```

### Главная кнопка (Main Button)

```typescript
// Показать главную кнопку
WebApp.MainButton.setText('Отправить');
WebApp.MainButton.show();
WebApp.MainButton.onClick(() => {
  // Действие при клике
});

// Скрыть главную кнопку
WebApp.MainButton.hide();
```

### Back Button

```typescript
// Показать кнопку "Назад"
WebApp.BackButton.show();
WebApp.BackButton.onClick(() => {
  // Обработка нажатия назад
  history.back();
});
```

### Haptic Feedback

```typescript
// Тактильная обратная связь
WebApp.HapticFeedback.impactOccurred('medium');
WebApp.HapticFeedback.notificationOccurred('success');
WebApp.HapticFeedback.selectionChanged();
```

### Cloud Storage

```typescript
// Сохранение данных в облаке Telegram
WebApp.CloudStorage.setItem('key', 'value', (error) => {
  if (!error) {
    WebApp.CloudStorage.getItem('key', (value) => {
      console.log('Значение из облака:', value);
    });
  }
});
```

---

## Рекомендации по использованию

### 1. Всегда проверяйте версию API

```typescript
if (WebApp.isVersionAtLeast('8.0')) {
  // Используем LocationManager
} else if (WebApp.isVersionAtLeast('6.0')) {
  // Fallback на старый requestLocation
} else {
  // Геолокация недоступна
}
```

### 2. Правильная обработка разрешений

- Всегда проверяйте `isPermissionGranted` перед запросом местоположения
- Используйте `openSettings()` только в ответ на действие пользователя
- Предоставляйте понятные объяснения, зачем нужна геолокация

### 3. Обработка ошибок

```typescript
try {
  const location = await getCurrentLocation();
  if (!location) {
    // Пользователь отказал или произошла ошибка
    // Предложить альтернативу
  }
} catch (error) {
  console.error('Ошибка получения геолокации:', error);
  // Fallback логика
}
```

### 4. Кэширование местоположения

- Сохраняйте местоположение в DeviceStorage или localStorage
- Обновляйте при необходимости (например, при явном запросе пользователя)
- Учитывайте точность и время получения

### 5. Производительность

- Инициализируйте LocationManager один раз при загрузке приложения
- Используйте события для отслеживания изменений вместо polling
- Не запрашивайте местоположение слишком часто

### 6. Безопасность

- Всегда проверяйте `initData` на сервере перед авторизацией
- Используйте SecureStorage для токенов и паролей
- Не доверяйте данным из `initDataUnsafe` без проверки подписи

---

## Миграция со старого API на новый

### Было (Bot API 6.0):

```typescript
WebApp.requestLocation((location) => {
  if (location) {
    useLocation(location);
  }
});
```

### Стало (Bot API 8.0+):

```typescript
const locationManager = WebApp.LocationManager;

if (!locationManager.isInitialized) {
  locationManager.init(() => {
    if (locationManager.isPermissionGranted) {
      locationManager.getLocation((locationData) => {
        if (locationData) {
          useLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude
          });
        }
      });
    } else {
      locationManager.openSettings();
    }
  });
} else {
  if (locationManager.isPermissionGranted) {
    locationManager.getLocation((locationData) => {
      if (locationData) {
        useLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude
        });
      }
    });
  }
}
```

---

## Полезные ссылки

- [Официальная документация Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [@twa-dev/sdk на npm](https://www.npmjs.com/package/@twa-dev/sdk)
- [Примеры Mini Apps](https://github.com/telegram-mini-apps)

---

## Заключение

Telegram Mini Apps предоставляют мощный набор инструментов для создания полнофункциональных приложений. Для работы с геолокацией рекомендуется использовать новый `LocationManager` API (Bot API 8.0+), который предоставляет больше контроля и гибкости по сравнению со старым методом `requestLocation`.
