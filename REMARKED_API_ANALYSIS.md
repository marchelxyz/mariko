# Анализ API ReMarked RESERVES API V1

## Общая информация

- **Версия API**: 1.0.1
- **Базовый URL**: `https://app.remarked.ru/api/v1`
- **Стандарт**: JSON RPC
- **Описание**: API для работы с бронированием столиков в системе ReMarked

---

## Структура эндпоинтов

### 1. `/ApiReservesWidget` (POST)
Основной эндпоинт для всех операций с бронированием. Поддерживает следующие методы:
- `GetToken`
- `GetDaysStates`
- `GetSlots`
- `GetSMSCode`
- `CreateReserve`
- `GetReservesByPhone`
- `ChangeReserveStatus`
- `GetReserveByID`
- `IsReserveRead`

### 2. `/api` (POST)
Эндпоинт для получения тегов событий:
- `getEventTags` (использует JSON RPC формат)

---

## Детальный анализ методов

### 1. GetToken
**Назначение**: Получение токена для работы с API конкретного заведения.

**Параметры запроса**:
```typescript
{
  method: "GetToken",           // Обязательно
  point: number,                // ID заведения (int64) - Обязательно
  additional_info?: boolean,    // Флаг для отображения capacity (по умолчанию: false)
  request_id?: string          // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  token: string,               // Токен для последующих запросов
  capacity?: {                 // Возвращается если additional_info=true
    min: number,               // Минимальное количество гостей
    max: number                // Максимальное количество гостей
  }
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetToken",
  "point": 7999999,
  "additional_info": true
}

// Ответ
{
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "capacity": {
    "min": 1,
    "max": 10
  }
}
```

---

### 2. GetDaysStates
**Назначение**: Получение информации о доступности дней в указанном периоде.

**Параметры запроса**:
```typescript
{
  method: "GetDaysStates",     // Обязательно
  token: string,               // Токен от GetToken - Обязательно
  reserve_date_period: {       // Обязательно
    from: string,              // Дата начала (формат: date)
    to: string                 // Дата окончания (формат: date)
  },
  guests_count: number         // Количество гостей (int64) - Обязательно
}
```

**Ответ**:
```typescript
{
  status: "success",
  slots: {                     // Объект с датами как ключами
    [date: string]: {
      date: string,            // Дата (формат: date)
      is_free: boolean         // Доступна ли дата для бронирования
    }
  }
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetDaysStates",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve_date_period": {
    "from": "2024-06-25",
    "to": "2024-06-30"
  },
  "guests_count": 4
}

// Ответ
{
  "status": "success",
  "slots": {
    "2024-06-25": {
      "date": "2024-06-25",
      "is_free": false
    },
    "2024-06-26": {
      "date": "2024-06-26",
      "is_free": true
    }
  }
}
```

---

### 3. GetSlots
**Назначение**: Получение доступных временных слотов для бронирования.

**Параметры запроса**:
```typescript
{
  method: "GetSlots",          // Обязательно
  token: string,               // Токен от GetToken - Обязательно
  reserve_date_period: {       // Обязательно
    from: string,              // Дата начала (формат: date)
    to: string                 // Дата окончания (формат: date)
  },
  guests_count: number,        // Количество гостей (int64) - Обязательно
  with_rooms?: boolean,        // При true возвращает залы и столы
  slot_duration?: number       // Длительность слота в секундах (300-86400)
}
```

**Ответ**:
```typescript
{
  status: "success",
  slots: Array<{
    start_stamp: number,       // Unix timestamp начала
    end_stamp: number,         // Unix timestamp окончания
    duration: number,           // Длительность в секундах
    start_datetime: string,    // Дата и время начала (формат: date-time)
    end_datetime: string,      // Дата и время окончания (формат: date-time)
    is_free: boolean,          // Свободен ли слот
    tables_count?: number,     // Количество доступных столов
    tables_ids?: number[],     // Массив ID столов
    table_bundles?: any[]      // Группы столов
  }>
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetSlots",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve_date_period": {
    "from": "2024-06-25",
    "to": "2024-06-25"
  },
  "guests_count": 4,
  "with_rooms": true
}

// Ответ
{
  "status": "success",
  "slots": [
    {
      "start_stamp": 1719316800,
      "end_stamp": 1719320400,
      "duration": 3600,
      "start_datetime": "2024-06-25 14:00:00",
      "end_datetime": "2024-06-25 15:00:00",
      "is_free": true,
      "tables_count": 3,
      "tables_ids": [11220, 12910]
    }
  ]
}
```

---

### 4. GetSMSCode
**Назначение**: Запрос SMS-кода для подтверждения бронирования.

**Параметры запроса**:
```typescript
{
  method: "GetSMSCode",        // Обязательно
  token: string,               // Токен от GetToken - Обязательно
  phone: string,               // Номер телефона (формат: +79189999999) - Обязательно
  request_id?: string          // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  status: "success"
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetSMSCode",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "phone": "+79189999999"
}

// Ответ
{
  "status": "success"
}
```

---

### 5. CreateReserve
**Назначение**: Создание нового бронирования.

**Параметры запроса**:
```typescript
{
  method: "CreateReserve",     // Обязательно
  token: string,               // Токен от GetToken - Обязательно
  reserve: {                   // Обязательно
    name: string,              // Имя клиента - Обязательно
    phone: string,             // Телефон (формат: +79999999999) - Обязательно
    date: string,              // Дата (формат: date) - Обязательно
    time: string,              // Время (формат: time) - Обязательно
    guests_count: number,       // Количество гостей (int64) - Обязательно
    email?: string,            // Email
    utm?: string,              // UTM метки
    deposit_sum?: number,      // Сумма депозита (float)
    deposit_status?: "no_deposit" | "not_paid" | "paid",  // Статус депозита
    comment?: string,          // Комментарий
    type?: "booking" | "banquet",  // Тип бронирования
    source?: "site" | "mobile_app",  // Источник брони
    duration?: number,         // Длительность в минутах (int64)
    table_ids?: number[],      // Массив ID столов
    eventTags?: number[],      // Массив ID тегов событий
    is_subscription?: boolean  // Подписка на рассылку
  },
  confirm_code?: number,       // SMS код подтверждения (если требуется)
  request_id?: string          // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  status: "success",
  reserve_id?: number,         // ID созданного бронирования (int64)
  form_url?: string            // URL формы оплаты (если требуется депозит)
}
```

**Пример**:
```json
// Запрос
{
  "method": "CreateReserve",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve": {
    "name": "TestClient",
    "phone": "+79999999999",
    "email": "test@mail.ru",
    "date": "2021-10-25",
    "time": "11:30",
    "guests_count": 4,
    "comment": "test",
    "type": "booking",
    "source": "site",
    "duration": 120,
    "table_ids": [11220, 12910],
    "eventTags": [14432, 14854],
    "is_subscription": true
  }
}

// Ответ
{
  "status": "success",
  "reserve_id": 1234567890,
  "form_url": "https://payment.example.com/form/..."
}
```

---

### 6. GetReservesByPhone
**Назначение**: Получение списка бронирований по номеру телефона.

**Параметры запроса**:
```typescript
{
  method: "GetReservesByPhone",  // Обязательно
  token: string,                 // Токен от GetToken - Обязательно
  phone: string,                 // Номер телефона - Обязательно
  guests_count: number,          // Количество гостей (int64) - Обязательно
  limit?: string,                // Лимит записей (по умолчанию: "100", максимум: 1000)
  offset?: string,               // Отступ (по умолчанию: "0")
  sort_by?: "id" | "estimated_time",  // Ключ сортировки (по умолчанию: "id")
  sort_direction?: "ASC" | "DESC",     // Направление сортировки (по умолчанию: "ASC")
  from?: string,                 // Минимальное время начала брони (формат: date)
  to?: string,                   // Максимальное время начала брони (формат: date)
  request_id?: string             // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  total: number,                // Всего резервов в базе по этому номеру за период
  count: number,                // Резервов возвращено в ответе
  offset: number,               // Отступ
  limit: number,                // Лимит
  reserves: Array<{
    id: number,                 // ID резерва (int64)
    surname: string,            // Фамилия гостя
    name: string,               // Имя гостя
    phone: string,              // Телефон гостя
    email: string,              // Email гостя
    estimated_time: string,     // Время начала брони
    duration: string,           // Длительность (мин)
    guests_count: string,       // Кол-во гостей
    inner_status: InnerStatus,  // Статус брони
    tables: TablesStructure,    // Структура столов
    comment: string,            // Комментарий
    manager: string,            // Ответственный
    source: string,             // Источник
    orders: string,             // Заказы, связанные с бронью
    cancel_reason: string,      // Причина отмены
    point?: number,             // ID заведения (если передан родительский ID)
    restaurant?: string         // Название заведения (если передан родительский ID)
  }>
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetReservesByPhone",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "phone": "+79999999999",
  "guests_count": 4,
  "limit": "10",
  "offset": "0",
  "sort_by": "estimated_time",
  "sort_direction": "DESC"
}

// Ответ
{
  "total": 5,
  "count": 5,
  "offset": 0,
  "limit": 10,
  "reserves": [
    {
      "id": 1234567890,
      "surname": "Иванов",
      "name": "Иван",
      "phone": "+79999999999",
      "email": "ivan@example.com",
      "estimated_time": "2024-06-25 14:00:00",
      "duration": "120",
      "guests_count": "4",
      "inner_status": "confirmed",
      "tables": {
        "19": {
          "room_name": "Веранда",
          "tables": {
            "330": "1",
            "331": "2"
          }
        }
      },
      "comment": "У окна",
      "manager": "Хостес",
      "source": "site",
      "orders": "",
      "cancel_reason": ""
    }
  ]
}
```

---

### 7. ChangeReserveStatus
**Назначение**: Изменение статуса бронирования.

**Параметры запроса**:
```typescript
{
  method: "ChangeReserveStatus",  // Обязательно
  token: string,                  // Токен от GetToken - Обязательно
  reserve_id: number,             // ID резерва/брони (int64) - Обязательно
  status: "new" | "waiting" | "confirmed" | "canceled" | "started" | "closed" | "error",  // Обязательно
  cancel_reason?: "guest_didnt_connect" | "rescheduled_by_guest" | "didnt_make_deposit" | 
                  "canceled_by_guest" | "guest_confirmed_but_didnt_come" | 
                  "canceled_by_appwteguide" | "other"  // Причина отмены (только для статуса "canceled")
}
```

**Ответ**:
```typescript
{
  status: "success",             // Статус операции
  reserve_id: number             // ID резерва/брони (int64)
}
```

**Пример**:
```json
// Запрос
{
  "method": "ChangeReserveStatus",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve_id": 1234567890,
  "status": "canceled",
  "cancel_reason": "canceled_by_guest"
}

// Ответ
{
  "status": "success",
  "reserve_id": 1234567890
}
```

---

### 8. GetReserveByID
**Назначение**: Получение информации о конкретном бронировании по ID.

**Параметры запроса**:
```typescript
{
  method: "GetReserveByID",     // Обязательно
  token: string,                // Токен от GetToken - Обязательно
  reserve_id: number,           // ID резерва (int64) - Обязательно
  request_id?: string            // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  reserve: {
    surname: string,            // Фамилия на кого был сделан резерв
    name: string,               // Имя на кого был сделан резерв
    phone: string,              // Телефон на кого был сделан резерв
    email: string,              // Email на кого был сделан резерв
    estimated_time: string,     // Время начала брони (формат: date-time)
    duration: number,           // Длительность резерва в минутах
    inner_status: InnerStatus,  // Статус брони
    tables: TablesStructure,    // Структура столов
    comment: string,            // Комментарий к брони
    manager: string,           // Ответственный брони
    source: string,             // Источник брони
    cancel_reason: string      // Причина отмены брони
  }
}
```

**Пример**:
```json
// Запрос
{
  "method": "GetReserveByID",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve_id": 3214
}

// Ответ
{
  "reserve": {
    "surname": "Иванов",
    "name": "Иван",
    "phone": "79939999999",
    "email": "ivan@example.com",
    "estimated_time": "2025-01-01 12:00:00",
    "duration": 120,
    "inner_status": "confirmed",
    "tables": {
      "19": {
        "room_name": "Веранда",
        "tables": {
          "330": "1"
        }
      }
    },
    "comment": "Комментарий",
    "manager": "Хостес",
    "source": "offline",
    "cancel_reason": ""
  }
}
```

---

### 9. IsReserveRead
**Назначение**: Проверка, прочитано ли бронирование.

**Параметры запроса**:
```typescript
{
  method: "IsReserveRead",      // Обязательно
  token: string,                // Токен от GetToken - Обязательно
  reserve_id: number,          // ID резерва (int64) - Обязательно
  request_id?: string           // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  status: "success",
  is_read: boolean             // Прочитан ли резерв
}
```

**Пример**:
```json
// Запрос
{
  "method": "IsReserveRead",
  "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc",
  "reserve_id": 3214
}

// Ответ
{
  "status": "success",
  "is_read": false
}
```

---

### 10. getEventTags (JSON RPC)
**Назначение**: Получение списка тегов событий.

**Параметры запроса**:
```typescript
{
  method: "ReservesWidgetApi.getEventTags",  // Обязательно
  jsonrpc: "2.0",                            // Версия JSON RPC (по умолчанию: 2) - Обязательно
  params: {                                  // Обязательно
    token: string                            // Токен от GetToken - Обязательно
  },
  id?: string                                // IDEMPOTENCY KEY (UUID)
}
```

**Ответ**:
```typescript
{
  jsonrpc: "2.0",
  result: {
    status: "success",
    eventTags: Array<{
      id: number,              // Id тега (int64)
      name: string,            // Наименование тега
      color: string            // Цвет тега в формате hex (например: "#ff0000")
    }>
  }
}
```

**Пример**:
```json
// Запрос
{
  "method": "ReservesWidgetApi.getEventTags",
  "jsonrpc": "2.0",
  "params": {
    "token": "b9e3bd1f4e3e70f3ff406a31352bf2fc"
  }
}

// Ответ
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "eventTags": [
      {
        "id": 14432,
        "name": "День рождения",
        "color": "#ff0000"
      },
      {
        "id": 14854,
        "name": "Корпоратив",
        "color": "#00ff00"
      }
    ]
  }
}
```

---

## Типы данных

### InnerStatus (Статус брони)
```typescript
type InnerStatus = 
  | "new"        // Бронь в статусе "Новая"
  | "waiting"    // Бронь в статусе "Ожидание"
  | "confirmed"  // Бронь в статусе "Подтверждена"
  | "started"    // Бронь в статусе "Гость пришел"
  | "closed"     // Бронь в статусе "Закрыта"
  | "canceled";  // Бронь в статусе "Отменена"
```

### TablesStructure (Структура столов)
```typescript
type TablesStructure = {
  [roomId: string]: {
    room_name: string,        // Название зала
    tables: {                  // Объект с ID столов как ключами
      [tableId: string]: string  // Номер стола
    }
  }
}

// Пример:
{
  "19": {
    "room_name": "Веранда",
    "tables": {
      "330": "1",
      "331": "2",
      "332": "3"
    }
  }
}
```

### DepositStatus (Статус депозита)
```typescript
type DepositStatus = 
  | "no_deposit"   // Без депозита
  | "not_paid"     // Не оплачен
  | "paid";        // Оплачен
```

### ReserveType (Тип бронирования)
```typescript
type ReserveType = 
  | "booking"  // Обычное бронирование
  | "banquet"; // Банкет
```

### ReserveSource (Источник брони)
```typescript
type ReserveSource = 
  | "site"        // Сайт
  | "mobile_app"; // Мобильное приложение
```

### CancelReason (Причина отмены)
```typescript
type CancelReason = 
  | "guest_didnt_connect"              // Не вышел на связь
  | "rescheduled_by_guest"             // Перенес резерв
  | "didnt_make_deposit"               // Не внесли депозит
  | "canceled_by_guest"                // Сам отменил резерв
  | "guest_confirmed_but_didnt_come"   // Подтвердил, но не пришел
  | "canceled_by_appwteguide"          // Отмена гостем в приложении WTEGuide
  | "other";                           // Другое
```

---

## Обработка ошибок

API возвращает следующие коды ошибок:

### Error400 (Bad Request)
```typescript
{
  status: "error",
  date: string,        // Дата и время на сервере (формат: date-time)
  code: 400,
  message: string      // Сообщение об ошибке
}
```

### Error401 (Unauthorized)
```typescript
{
  status: "error",
  date: string,        // Дата и время на сервере (формат: date-time)
  code: 401,
  message: string      // Например: "Empty Bearer Token"
}
```

### Error403 (Forbidden)
```typescript
{
  status: "error",
  date: string,        // Дата и время на сервере (формат: date-time)
  code: 403,
  message: string      // Например: "Access Denied"
}
```

### Error404 (Not Found)
```typescript
{
  status: "error",
  date: string,        // Дата отправки запроса (формат: date)
  code: 404,
  message: string      // Например: "Not Found"
}
```

### Error520 (Unknown Error)
```typescript
{
  code: {
    status: "error",
    date: string,      // Дата и время (формат: date-time)
    code: 520,
    message: string    // Сообщение об ошибке
  },
  message: string     // Например: "Данный элемент не найден"
}
```

---

## Особенности работы с API

### 1. Токен (Token)
- Получается через метод `GetToken` с указанием ID заведения (`point`)
- Используется во всех последующих запросах
- Вероятно, имеет ограниченный срок действия

### 2. IDEMPOTENCY KEY (request_id)
- Опциональный параметр типа UUID
- Используется для предотвращения дублирования запросов
- Рекомендуется использовать для методов создания/изменения данных

### 3. Форматы дат и времени
- **date**: `YYYY-MM-DD` (например: `2024-06-25`)
- **time**: `HH:mm` (например: `11:30`)
- **date-time**: `YYYY-MM-DD HH:mm:ss` (например: `2024-06-25 14:00:00`)
- **timestamp**: Unix timestamp в секундах

### 4. Номера телефонов
- Формат: `+79189999999` или `+79999999999`
- Всегда начинается с `+` и кода страны

### 5. SMS подтверждение
- Метод `GetSMSCode` отправляет SMS с кодом подтверждения
- Код передается в `CreateReserve` через параметр `confirm_code`
- Используется только если настроена отправка SMS

### 6. Онлайн-оплата депозита
- При создании бронирования с депозитом может вернуться `form_url`
- Это URL формы для оплаты депозита онлайн

### 7. Структура столов (TablesStructure)
- Столы группируются по залам (rooms)
- Ключ объекта - ID зала
- Внутри зала - объект с ID столов как ключами и номерами столов как значениями

---

## Рекомендации по интеграции

### 1. Создание сервиса для работы с API
Рекомендуется создать отдельный сервис `RemarkedService` для инкапсуляции логики работы с API:

```typescript
// backend/src/services/remarkedService.ts
class RemarkedService {
  private baseUrl = 'https://app.remarked.ru/api/v1';
  
  async getToken(pointId: number, additionalInfo?: boolean): Promise<string> { }
  async getDaysStates(token: string, period: DatePeriod, guestsCount: number): Promise<DaysStates> { }
  async getSlots(token: string, period: DatePeriod, guestsCount: number, options?: SlotOptions): Promise<Slot[]> { }
  async getSMSCode(token: string, phone: string): Promise<void> { }
  async createReserve(token: string, reserve: ReserveData, confirmCode?: number): Promise<CreateReserveResponse> { }
  async getReservesByPhone(token: string, phone: string, guestsCount: number, filters?: ReserveFilters): Promise<ReservesList> { }
  async changeReserveStatus(token: string, reserveId: number, status: InnerStatus, cancelReason?: CancelReason): Promise<void> { }
  async getReserveById(token: string, reserveId: number): Promise<Reserve> { }
  async isReserveRead(token: string, reserveId: number): Promise<boolean> { }
  async getEventTags(token: string): Promise<EventTag[]> { }
}
```

### 2. Типы TypeScript
Создать файл с типами для всех структур данных API:

```typescript
// backend/src/types/remarked.ts
export type InnerStatus = "new" | "waiting" | "confirmed" | "started" | "closed" | "canceled";
export type DepositStatus = "no_deposit" | "not_paid" | "paid";
export type ReserveType = "booking" | "banquet";
export type ReserveSource = "site" | "mobile_app";
export type CancelReason = "guest_didnt_connect" | "rescheduled_by_guest" | "didnt_make_deposit" | "canceled_by_guest" | "guest_confirmed_but_didnt_come" | "canceled_by_appwteguide" | "other";

export interface TablesStructure {
  [roomId: string]: {
    room_name: string;
    tables: { [tableId: string]: string };
  };
}

// ... и т.д.
```

### 3. Интеграция с моделью Restaurant
Добавить поле `remarkedPointId` в модель `Restaurant`:

```typescript
@Column({ nullable: true })
remarkedPointId?: number;  // ID заведения в системе ReMarked
```

### 4. Обновление роута booking.ts
Использовать новый сервис для создания бронирований через ReMarked API.

### 5. Обработка ошибок
Реализовать централизованную обработку ошибок API с преобразованием в понятные сообщения для пользователя.

### 6. Кэширование токенов
Токены можно кэшировать в Redis для уменьшения количества запросов к API.

---

## Примеры использования

### Полный цикл создания бронирования:

1. **Получение токена**:
```typescript
const token = await remarkedService.getToken(restaurant.remarkedPointId, true);
```

2. **Проверка доступности дат**:
```typescript
const daysStates = await remarkedService.getDaysStates(
  token,
  { from: "2024-06-25", to: "2024-06-30" },
  4
);
```

3. **Получение доступных слотов**:
```typescript
const slots = await remarkedService.getSlots(
  token,
  { from: "2024-06-25", to: "2024-06-25" },
  4,
  { with_rooms: true }
);
```

4. **Отправка SMS кода** (если требуется):
```typescript
await remarkedService.getSMSCode(token, "+79189999999");
```

5. **Создание бронирования**:
```typescript
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
  confirmCode  // если требуется SMS подтверждение
);
```

6. **Проверка статуса бронирования**:
```typescript
const reserve = await remarkedService.getReserveById(token, result.reserve_id);
```

---

## Заключение

API ReMarked предоставляет полный функционал для работы с бронированием столиков в ресторанах. Основные возможности:
- Получение информации о доступности
- Создание и управление бронированиями
- Работа с SMS подтверждением
- Онлайн оплата депозитов
- Получение истории бронирований
- Управление статусами бронирований

Для успешной интеграции рекомендуется создать отдельный сервис, типы данных и обновить существующие модели и роуты.
