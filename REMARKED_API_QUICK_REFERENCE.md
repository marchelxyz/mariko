# ReMarked API - Краткая справка

## Быстрый старт

### 1. Импорт сервиса
```typescript
import { remarkedService } from './services/remarkedService';
// или
import { RemarkedService } from './services/remarkedService';
const service = new RemarkedService();
```

### 2. Базовый поток работы

```typescript
// Шаг 1: Получить токен
const tokenResponse = await remarkedService.getToken(restaurantPointId, true);
const token = tokenResponse.token;

// Шаг 2: Проверить доступность дат
const daysStates = await remarkedService.getDaysStates(
  token,
  { from: "2024-06-25", to: "2024-06-30" },
  4
);

// Шаг 3: Получить доступные слоты
const slots = await remarkedService.getSlots(
  token,
  { from: "2024-06-25", to: "2024-06-25" },
  4,
  { with_rooms: true }
);

// Шаг 4: Создать бронирование
const reserve = await remarkedService.createReserve(token, {
  name: "Иван Иванов",
  phone: "+79189999999",
  email: "ivan@example.com",
  date: "2024-06-25",
  time: "14:00",
  guests_count: 4,
  duration: 120,
  source: "site"
});
```

---

## Основные методы

### Получение токена
```typescript
getToken(pointId: number, additionalInfo?: boolean, requestId?: string)
```
- **pointId**: ID заведения в ReMarked
- **additionalInfo**: Получить информацию о вместимости (min/max гостей)
- Возвращает: `{ token: string, capacity?: { min, max } }`

### Проверка доступности дней
```typescript
getDaysStates(token: string, period: DatePeriod, guestsCount: number)
```
- **period**: `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }`
- Возвращает: объект с датами и флагом `is_free`

### Получение временных слотов
```typescript
getSlots(token: string, period: DatePeriod, guestsCount: number, options?: SlotOptions)
```
- **options**: `{ with_rooms?: boolean, slot_duration?: number }`
- Возвращает: массив слотов с временем и доступными столами

### Создание бронирования
```typescript
createReserve(token: string, reserve: ReserveData, confirmCode?: number, requestId?: string)
```
- **reserve**: Обязательные поля: `name`, `phone`, `date`, `time`, `guests_count`
- Возвращает: `{ status, reserve_id?, form_url? }`

### Получение бронирований по телефону
```typescript
getReservesByPhone(token: string, phone: string, guestsCount: number, filters?: ReserveFilters)
```
- **filters**: `{ limit?, offset?, sort_by?, sort_direction?, from?, to? }`
- Возвращает: список бронирований с пагинацией

### Изменение статуса
```typescript
changeReserveStatus(token: string, reserveId: number, status: InnerStatus, cancelReason?: CancelReason)
```
- **status**: `"new" | "waiting" | "confirmed" | "started" | "closed" | "canceled"`
- **cancelReason**: Только для статуса `"canceled"`

### Получение бронирования по ID
```typescript
getReserveById(token: string, reserveId: number, requestId?: string)
```

### Проверка прочитанности
```typescript
isReserveRead(token: string, reserveId: number, requestId?: string)
```

### Получение тегов событий
```typescript
getEventTags(token: string, requestId?: string)
```

### Отправка SMS кода
```typescript
getSMSCode(token: string, phone: string, requestId?: string)
```

---

## Типы данных

### InnerStatus (Статус бронирования)
```typescript
"new" | "waiting" | "confirmed" | "started" | "closed" | "canceled"
```

### ReserveData (Данные для бронирования)
```typescript
{
  name: string;              // Обязательно
  phone: string;             // Обязательно (+79999999999)
  date: string;              // Обязательно (YYYY-MM-DD)
  time: string;              // Обязательно (HH:mm)
  guests_count: number;      // Обязательно
  email?: string;
  comment?: string;
  duration?: number;         // В минутах
  table_ids?: number[];
  eventTags?: number[];
  source?: "site" | "mobile_app";
  type?: "booking" | "banquet";
  deposit_sum?: number;
  deposit_status?: "no_deposit" | "not_paid" | "paid";
  is_subscription?: boolean;
}
```

### CancelReason (Причина отмены)
```typescript
"guest_didnt_connect" | "rescheduled_by_guest" | "didnt_make_deposit" |
"canceled_by_guest" | "guest_confirmed_but_didnt_come" |
"canceled_by_appwteguide" | "other"
```

---

## Форматы данных

### Дата и время
- **date**: `YYYY-MM-DD` (например: `2024-06-25`)
- **time**: `HH:mm` (например: `14:00`)
- **date-time**: `YYYY-MM-DD HH:mm:ss` (например: `2024-06-25 14:00:00`)

### Телефон
- Формат: `+79189999999` или `+79999999999`
- Всегда начинается с `+` и кода страны

### IDEMPOTENCY KEY (request_id)
- Опциональный параметр типа UUID
- Используется для предотвращения дублирования запросов
- Рекомендуется для методов создания/изменения данных

---

## Обработка ошибок

```typescript
try {
  const result = await remarkedService.getToken(pointId);
} catch (error) {
  if (error.code === 401) {
    // Неверный токен или отсутствует авторизация
  } else if (error.code === 400) {
    // Неверные параметры запроса
  } else if (error.code === 404) {
    // Ресурс не найден
  } else if (error.code === 520) {
    // Внутренняя ошибка сервера
  }
}
```

---

## Примеры использования

### Полный цикл бронирования с SMS подтверждением

```typescript
// 1. Получить токен
const { token, capacity } = await remarkedService.getToken(7999999, true);
console.log(`Вместимость: ${capacity.min}-${capacity.max} гостей`);

// 2. Проверить доступность
const daysStates = await remarkedService.getDaysStates(
  token,
  { from: "2024-06-25", to: "2024-06-30" },
  4
);

// 3. Получить слоты для выбранной даты
const slots = await remarkedService.getSlots(
  token,
  { from: "2024-06-25", to: "2024-06-25" },
  4,
  { with_rooms: true }
);

// 4. Отправить SMS код
await remarkedService.getSMSCode(token, "+79189999999");

// 5. Создать бронирование с кодом подтверждения
const result = await remarkedService.createReserve(
  token,
  {
    name: "Иван Иванов",
    phone: "+79189999999",
    email: "ivan@example.com",
    date: "2024-06-25",
    time: "14:00",
    guests_count: 4,
    duration: 120,
    table_ids: [11220],
    source: "site"
  },
  1234 // SMS код подтверждения
);

console.log(`Бронирование создано: ${result.reserve_id}`);
if (result.form_url) {
  console.log(`URL для оплаты: ${result.form_url}`);
}
```

### Получение истории бронирований

```typescript
const reserves = await remarkedService.getReservesByPhone(
  token,
  "+79189999999",
  4,
  {
    limit: "10",
    offset: "0",
    sort_by: "estimated_time",
    sort_direction: "DESC",
    from: "2024-01-01",
    to: "2024-12-31"
  }
);

console.log(`Всего бронирований: ${reserves.total}`);
console.log(`Возвращено: ${reserves.count}`);
reserves.reserves.forEach(reserve => {
  console.log(`${reserve.name} - ${reserve.estimated_time} (${reserve.inner_status})`);
});
```

### Изменение статуса бронирования

```typescript
// Подтвердить бронирование
await remarkedService.changeReserveStatus(
  token,
  1234567890,
  "confirmed"
);

// Отменить бронирование с указанием причины
await remarkedService.changeReserveStatus(
  token,
  1234567890,
  "canceled",
  "canceled_by_guest"
);
```

### Получение информации о бронировании

```typescript
const reserveInfo = await remarkedService.getReserveById(token, 1234567890);
console.log(`Гость: ${reserveInfo.reserve.name} ${reserveInfo.reserve.surname}`);
console.log(`Время: ${reserveInfo.reserve.estimated_time}`);
console.log(`Статус: ${reserveInfo.reserve.inner_status}`);
console.log(`Столы:`, reserveInfo.reserve.tables);
```

---

## Интеграция с существующим проектом

### 1. Добавить поле в модель Restaurant

```typescript
// backend/src/models/Restaurant.ts
@Column({ nullable: true })
remarkedPointId?: number;  // ID заведения в системе ReMarked
```

### 2. Использовать в роуте booking.ts

```typescript
import { remarkedService } from '../services/remarkedService';

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const restaurant = await getRestaurantById(req.body.restaurantId);
    
    if (!restaurant.remarkedPointId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Restaurant not configured for booking' 
      });
    }

    // Получить токен
    const { token } = await remarkedService.getToken(restaurant.remarkedPointId);
    
    // Создать бронирование
    const result = await remarkedService.createReserve(token, {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      date: req.body.date,
      time: req.body.time,
      guests_count: req.body.guests_count,
      duration: req.body.duration,
      source: "site"
    });

    res.status(201).json({ 
      success: true, 
      data: { 
        reserve_id: result.reserve_id,
        form_url: result.form_url 
      } 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create booking' 
    });
  }
});
```

---

## Полезные ссылки

- **Полная документация**: `REMARKED_API_ANALYSIS.md`
- **Типы TypeScript**: `backend/src/types/remarked.ts`
- **Сервис**: `backend/src/services/remarkedService.ts`
- **Базовый URL**: `https://app.remarked.ru/api/v1`

---

## Примечания

1. **Токены**: Токены получаются для конкретного заведения и используются во всех последующих запросах
2. **IDEMPOTENCY**: Используйте `request_id` для предотвращения дублирования запросов
3. **SMS подтверждение**: Не все заведения требуют SMS подтверждение
4. **Онлайн оплата**: `form_url` возвращается только если требуется депозит
5. **Ограничения**: Лимит записей в `getReservesByPhone` - максимум 1000
