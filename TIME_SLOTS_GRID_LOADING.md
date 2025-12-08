# Загрузка сетки времени для бронирования

Детальное описание процесса загрузки и отображения сетки временных слотов для бронирования столиков.

---

## 1. Триггеры загрузки слотов

Загрузка временных слотов происходит автоматически при изменении следующих параметров:

### Код триггера (`frontend/pages/booking.tsx`)

```typescript
// Загружаем слоты при изменении даты или количества гостей
useEffect(() => {
  if (selectedRestaurant?.id && formData.date && formData.guests_count >= 1) {
    loadSlots();
  } else {
    // Очищаем состояние, если условия не выполнены
    setSlots([]);
    setSelectedSlot(null);
    setSelectedTableIds([]);
    setFormData(prev => ({ ...prev, time: '' }));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formData.date, formData.guests_count, selectedRestaurant?.id]);
```

### Условия загрузки:

1. **Выбран ресторан** (`selectedRestaurant?.id` должен существовать)
2. **Выбрана дата** (`formData.date` не пустая строка)
3. **Указано количество гостей** (`formData.guests_count >= 1`)

Если любое из условий не выполнено, слоты очищаются и выбор времени сбрасывается.

---

## 2. Функция загрузки слотов

### Полный код функции `loadSlots()`

```typescript
// Загрузка доступных слотов
const loadSlots = async () => {
  // Проверка условий перед загрузкой
  if (!selectedRestaurant?.id || !formData.date || formData.guests_count < 1) {
    return;
  }

  // Устанавливаем состояние загрузки
  setLoadingSlots(true);
  setError(null);
  
  // Сбрасываем выбранные данные
  setSelectedSlot(null);
  setSelectedTableIds([]);
  setFormData(prev => ({ ...prev, time: '' }));

  try {
    // Запрос к API для получения слотов
    const response = await api.get<SlotsResponse>('/booking/slots', {
      params: {
        restaurantId: selectedRestaurant.id,
        date: formData.date,
        guests_count: formData.guests_count,
        with_rooms: true, // Получаем информацию о залах и столах
      },
    });

    if (response.data.success) {
      // Фильтруем только свободные слоты
      const freeSlots = response.data.data.slots.filter(slot => slot.is_free);
      setSlots(freeSlots);
    }
  } catch (error: any) {
    console.error('Ошибка загрузки слотов:', error);
    setSlots([]);
    // Не показываем ошибку пользователю, просто очищаем слоты
  } finally {
    setLoadingSlots(false);
  }
};
```

### Что происходит в функции:

1. **Валидация**: Проверяются все необходимые параметры
2. **Установка состояния загрузки**: `setLoadingSlots(true)` - показывает индикатор загрузки
3. **Сброс выбранных данных**: Очищаются предыдущий выбор времени и столов
4. **HTTP запрос**: Отправляется GET запрос к `/booking/slots` с параметрами:
   - `restaurantId` - ID ресторана
   - `date` - выбранная дата (формат: `YYYY-MM-DD`)
   - `guests_count` - количество гостей
   - `with_rooms: true` - флаг для получения информации о залах и столах
5. **Фильтрация**: Оставляются только свободные слоты (`slot.is_free === true`)
6. **Сохранение в состояние**: Отфильтрованные слоты сохраняются в `slots`
7. **Завершение загрузки**: `setLoadingSlots(false)` - скрывает индикатор загрузки

---

## 3. Запрос к бэкенду

### HTTP запрос (через `api.get`)

```typescript
const response = await api.get<SlotsResponse>('/booking/slots', {
  params: {
    restaurantId: selectedRestaurant.id,
    date: formData.date,
    guests_count: formData.guests_count,
    with_rooms: true,
  },
});
```

### Что происходит на бэкенде (`backend/src/routes/booking.ts`)

```typescript
router.get('/slots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, date, guests_count, with_rooms } = req.query;

    // Валидация обязательных параметров
    if (!restaurantId || !date || !guests_count) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют обязательные параметры: restaurantId, date, guests_count',
      });
    }

    // Получаем ресторан из кеша или базы данных
    let restaurant: Restaurant | null = null;
    restaurant = await getRestaurantFromCache(restaurantId as string);

    if (!restaurant) {
      const restaurantRepository = AppDataSource.getRepository(Restaurant);
      restaurant = await restaurantRepository.findOne({
        where: { id: restaurantId as string },
      });

      if (restaurant) {
        await setRestaurantToCache(restaurantId as string, restaurant);
      }
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Ресторан не найден',
      });
    }

    if (!restaurant.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ресторан неактивен',
      });
    }

    // Проверяем наличие ReMarked Point ID
    if (!restaurant.remarkedPointId) {
      return res.status(400).json({
        success: false,
        message: 'Ресторан не настроен для бронирования. Обратитесь к администратору.',
      });
    }

    // Получаем токен от ReMarked API (с кешированием)
    let token: string;
    try {
      const tokenResponse = await remarkedService.getToken(restaurant.remarkedPointId);
      token = tokenResponse.token;
    } catch (error: any) {
      console.error('Ошибка получения токена ReMarked:', error);
      return res.status(500).json({
        success: false,
        message: 'Не удалось подключиться к сервису бронирования. Попробуйте позже.',
      });
    }

    // Формируем период (одна дата)
    const dateStr = date as string;
    const period = {
      from: dateStr,
      to: dateStr,
    };

    const guestsCount = Number(guests_count);
    const withRooms = with_rooms === 'true' || with_rooms === undefined || with_rooms === '';

    // Получаем слоты со столами из ReMarked API
    try {
      const slotsResponse = await remarkedService.getSlots(
        token,
        period,
        guestsCount,
        { with_rooms: withRooms }
      );

      return res.json({
        success: true,
        data: {
          slots: slotsResponse.slots,
          date: dateStr,
          guests_count: guestsCount,
        },
      });
    } catch (error: any) {
      console.error('Ошибка получения слотов ReMarked:', error);
      
      if (error.code === 400) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Неверные параметры запроса',
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Не удалось получить доступные слоты. Попробуйте позже.',
      });
    }
  } catch (error: any) {
    console.error('[booking/slots] Ошибка получения слотов:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось получить доступные слоты',
    });
  }
});
```

### Запрос к ReMarked API (`backend/src/services/remarkedService.ts`)

```typescript
async getSlots(
  token: string,
  period: DatePeriod,
  guestsCount: number,
  options?: SlotOptions
): Promise<GetSlotsResponse> {
  const request: GetSlotsRequest = {
    method: 'GetSlots',
    token,
    reserve_date_period: period,
    guests_count: guestsCount,
    ...(options?.with_rooms !== undefined && { with_rooms: options.with_rooms }),
    ...(options?.slot_duration !== undefined && { slot_duration: options.slot_duration }),
  };

  return this.request<GetSlotsResponse>('/ApiReservesWidget', request);
}
```

### Структура запроса к ReMarked API:

```json
{
  "method": "GetSlots",
  "token": "abc123...",
  "reserve_date_period": {
    "from": "2024-01-15",
    "to": "2024-01-15"
  },
  "guests_count": 4,
  "with_rooms": true
}
```

### Структура ответа от ReMarked API:

```json
{
  "status": "success",
  "slots": [
    {
      "start_stamp": 1705320000,
      "end_stamp": 1705323600,
      "duration": 3600,
      "start_datetime": "2024-01-15 18:00:00",
      "end_datetime": "2024-01-15 19:00:00",
      "is_free": true,
      "tables_count": 5,
      "tables_ids": [101, 102, 103, 104, 105],
      "table_bundles": [
        [101, 102],
        [103, 104]
      ],
      "rooms": [
        {
          "room_id": "1",
          "room_name": "Основной зал",
          "tables": [101, 102, 103]
        }
      ]
    },
    {
      "start_stamp": 1705323600,
      "end_stamp": 1705327200,
      "duration": 3600,
      "start_datetime": "2024-01-15 19:00:00",
      "end_datetime": "2024-01-15 20:00:00",
      "is_free": true,
      "tables_count": 3,
      "tables_ids": [101, 102, 103],
      "table_bundles": [],
      "rooms": []
    },
    {
      "start_stamp": 1705327200,
      "end_stamp": 1705330800,
      "duration": 3600,
      "start_datetime": "2024-01-15 20:00:00",
      "end_datetime": "2024-01-15 21:00:00",
      "is_free": false,
      "tables_count": 0,
      "tables_ids": [],
      "table_bundles": [],
      "rooms": []
    }
  ]
}
```

---

## 4. Обработка ответа и фильтрация

### Фильтрация свободных слотов

```typescript
if (response.data.success) {
  // Фильтруем только свободные слоты
  const freeSlots = response.data.data.slots.filter(slot => slot.is_free);
  setSlots(freeSlots);
}
```

### Что происходит:

1. **Проверка успешности**: Проверяется `response.data.success === true`
2. **Фильтрация**: Из всех слотов выбираются только те, где `slot.is_free === true`
3. **Сохранение**: Отфильтрованные слоты сохраняются в состояние `slots`

### Пример фильтрации:

**До фильтрации** (3 слота):
- Слот 1: `is_free: true` ✅
- Слот 2: `is_free: true` ✅
- Слот 3: `is_free: false` ❌

**После фильтрации** (2 слота):
- Слот 1: `is_free: true` ✅
- Слот 2: `is_free: true` ✅

---

## 5. Отображение сетки времени

### Компонент сетки (`frontend/pages/booking.tsx`)

```typescript
<div>
  <label className="block text-sm font-medium text-text-primary mb-1">
    Время <span className="text-red-500">*</span>
  </label>
  {loadingSlots ? (
    // Индикатор загрузки
    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
      <span className="text-gray-500 text-sm">Загрузка доступного времени...</span>
    </div>
  ) : slots.length === 0 && formData.date ? (
    // Сообщение об отсутствии слотов
    <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50">
      <span className="text-red-600 text-sm">Нет доступного времени на эту дату</span>
    </div>
  ) : (
    // СЕТКА ВРЕМЕННЫХ СЛОТОВ
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
        {slots.map((slot) => {
          // Извлекаем время из start_datetime
          // Формат: "2024-01-15 18:00:00" -> "18:00"
          const timeStr = slot.start_datetime.split(' ')[1]?.substring(0, 5) || '';
          
          // Проверяем, выбран ли этот слот
          const isSelected = selectedSlot?.start_stamp === slot.start_stamp;
          
          return (
            <button
              key={slot.start_stamp}
              type="button"
              onClick={() => handleSlotSelect(slot)}
              className={`px-3 py-2 text-sm rounded-md border transition-all ${
                isSelected
                  ? 'bg-primary text-text-secondary border-primary shadow-md'
                  : 'bg-white text-text-primary border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-sm'
              }`}
            >
              {/* Отображаем время (HH:mm) */}
              <span className="font-medium">{timeStr}</span>
              
              {/* Отображаем количество доступных столов */}
              {slot.tables_count !== undefined && slot.tables_count > 0 && (
                <span className={`block text-xs mt-1 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                  {slot.tables_count} {slot.tables_count === 1 ? 'стол' : slot.tables_count < 5 ? 'стола' : 'столов'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  )}
</div>
```

### Структура сетки:

1. **CSS Grid Layout**:
   - `grid grid-cols-3` - 3 колонки на мобильных устройствах
   - `sm:grid-cols-4` - 4 колонки на экранах больше 640px
   - `gap-2` - отступ между элементами
   - `max-h-64` - максимальная высота с прокруткой
   - `overflow-y-auto` - вертикальная прокрутка при переполнении

2. **Каждая кнопка слота**:
   - `key={slot.start_stamp}` - уникальный ключ (Unix timestamp)
   - `onClick={() => handleSlotSelect(slot)}` - обработчик выбора
   - Условные стили в зависимости от выбора (`isSelected`)

3. **Отображаемая информация**:
   - **Время**: Извлекается из `start_datetime` (формат: `HH:mm`)
   - **Количество столов**: Показывается только если `tables_count > 0`

---

## 6. Обработка выбора слота

### Функция `handleSlotSelect`

```typescript
// Выбор слота
const handleSlotSelect = (slot: Slot) => {
  // Сохраняем выбранный слот в состояние
  setSelectedSlot(slot);
  
  // Форматируем время для поля time (HH:mm)
  // start_datetime имеет формат: "2024-01-15 18:00:00"
  // Извлекаем часть после пробела и берем первые 5 символов: "18:00"
  const timeStr = slot.start_datetime.split(' ')[1]?.substring(0, 5) || '';
  
  // Устанавливаем время в форму
  setFormData(prev => ({ ...prev, time: timeStr }));
  
  // Сбрасываем выбранные столы при смене слота
  setSelectedTableIds([]);
};
```

### Что происходит при выборе:

1. **Сохранение слота**: Выбранный слот сохраняется в `selectedSlot`
2. **Извлечение времени**: Из `start_datetime` извлекается время в формате `HH:mm`
3. **Обновление формы**: Время устанавливается в поле `formData.time`
4. **Сброс столов**: Очищаются ранее выбранные столы

### Визуальная обратная связь:

- **Выбранный слот**: `bg-primary text-text-secondary border-primary shadow-md`
- **Невыбранный слот**: `bg-white text-text-primary border-gray-300 hover:border-primary hover:bg-primary/5`

---

## 7. Состояния компонента

### Состояния, связанные с загрузкой слотов:

```typescript
// Состояние для слотов и выбранного слота
const [slots, setSlots] = useState<Slot[]>([]);              // Массив доступных слотов
const [loadingSlots, setLoadingSlots] = useState(false);   // Флаг загрузки
const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);  // Выбранный слот
const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);  // Выбранные столы

// Данные формы
const [formData, setFormData] = useState({
  name: '',
  phone: '',
  date: '',              // Триггер загрузки
  time: '',              // Устанавливается при выборе слота
  guests_count: 2,       // Триггер загрузки
  comment: '',
});
```

### Жизненный цикл состояний:

1. **Начальное состояние**:
   - `slots = []`
   - `loadingSlots = false`
   - `selectedSlot = null`

2. **При изменении даты/количества гостей**:
   - `loadingSlots = true`
   - `slots = []` (очищаются)
   - `selectedSlot = null` (сбрасывается)

3. **После успешной загрузки**:
   - `loadingSlots = false`
   - `slots = [свободные слоты]`

4. **При выборе слота**:
   - `selectedSlot = выбранный слот`
   - `formData.time = "HH:mm"`

---

## 8. Полный поток данных

### Визуальная схема процесса:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ПОЛЬЗОВАТЕЛЬ ВЫБИРАЕТ ДАТУ И КОЛИЧЕСТВО ГОСТЕЙ          │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. useEffect ТРИГГЕРИТСЯ                                    │
│    Зависимости: [formData.date, formData.guests_count]     │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ВЫЗОВ loadSlots()                                        │
│    - setLoadingSlots(true)                                  │
│    - setSelectedSlot(null)                                  │
│    - setSlots([])                                           │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HTTP ЗАПРОС К БЭКЕНДУ                                    │
│    GET /booking/slots                                       │
│    Параметры:                                               │
│    - restaurantId: "uuid"                                   │
│    - date: "2024-01-15"                                     │
│    - guests_count: 4                                        │
│    - with_rooms: true                                      │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. БЭКЕНД ОБРАБАТЫВАЕТ ЗАПРОС                               │
│    - Получает ресторан из кеша/БД                           │
│    - Проверяет remarkedPointId                              │
│    - Получает токен от ReMarked API                         │
│    - Вызывает remarkedService.getSlots()                   │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ЗАПРОС К REMARKED API                                    │
│    POST /ApiReservesWidget                                  │
│    {                                                        │
│      method: "GetSlots",                                    │
│      token: "...",                                          │
│      reserve_date_period: {                                 │
│        from: "2024-01-15",                                 │
│        to: "2024-01-15"                                    │
│      },                                                     │
│      guests_count: 4,                                      │
│      with_rooms: true                                       │
│    }                                                        │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. REMARKED API ВОЗВРАЩАЕТ СЛОТЫ                           │
│    {                                                        │
│      status: "success",                                     │
│      slots: [                                               │
│        { start_datetime: "2024-01-15 18:00:00",            │
│          is_free: true, ... },                              │
│        { start_datetime: "2024-01-15 19:00:00",            │
│          is_free: true, ... },                              │
│        { start_datetime: "2024-01-15 20:00:00",           │
│          is_free: false, ... }                              │
│      ]                                                      │
│    }                                                        │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. БЭКЕНД ВОЗВРАЩАЕТ ОТВЕТ ФРОНТЕНДУ                        │
│    {                                                        │
│      success: true,                                         │
│      data: {                                                │
│        slots: [...],                                        │
│        date: "2024-01-15",                                 │
│        guests_count: 4                                     │
│      }                                                      │
│    }                                                        │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. ФРОНТЕНД ФИЛЬТРУЕТ СЛОТЫ                                 │
│    const freeSlots = slots.filter(slot => slot.is_free)    │
│    setSlots(freeSlots)                                      │
│    setLoadingSlots(false)                                   │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. ОТОБРАЖЕНИЕ СЕТКИ ВРЕМЕНИ                               │
│     - grid grid-cols-3 sm:grid-cols-4                       │
│     - Каждый слот отображается как кнопка                  │
│     - Показывается время (HH:mm)                            │
│     - Показывается количество столов                       │
└───────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. ПОЛЬЗОВАТЕЛЬ ВЫБИРАЕТ ВРЕМЯ                             │
│     - handleSlotSelect(slot)                               │
│     - setSelectedSlot(slot)                                │
│     - setFormData({ ...prev, time: "18:00" })              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Обработка ошибок

### Обработка ошибок при загрузке

```typescript
try {
  const response = await api.get<SlotsResponse>('/booking/slots', {
    params: {
      restaurantId: selectedRestaurant.id,
      date: formData.date,
      guests_count: formData.guests_count,
      with_rooms: true,
    },
  });

  if (response.data.success) {
    const freeSlots = response.data.data.slots.filter(slot => slot.is_free);
    setSlots(freeSlots);
  }
} catch (error: any) {
  console.error('Ошибка загрузки слотов:', error);
  setSlots([]);
  // Не показываем ошибку пользователю, просто очищаем слоты
} finally {
  setLoadingSlots(false);
}
```

### Стратегия обработки ошибок:

1. **Логирование**: Ошибка логируется в консоль для отладки
2. **Очистка состояния**: Слоты очищаются (`setSlots([])`)
3. **Скрытие индикатора**: Загрузка завершается (`setLoadingSlots(false)`)
4. **Без показа ошибки**: Пользователю не показывается сообщение об ошибке, чтобы не пугать его

### Возможные ошибки:

- **400**: Неверные параметры запроса
- **404**: Ресторан не найден
- **500**: Ошибка сервера или ReMarked API
- **Сетевые ошибки**: Таймаут, отсутствие соединения

---

## 10. Оптимизации и особенности

### Кеширование токена ReMarked

Токен для ReMarked API кешируется на бэкенде, чтобы не запрашивать его при каждом запросе слотов:

```typescript
// Бэкенд кеширует токен на 55 минут
const cachedToken = await getRemarkedTokenFromCache(pointId);
if (cachedToken) {
  return { token: cachedToken };
}
```

### Автоматическая очистка при изменении параметров

При изменении даты или количества гостей автоматически:
- Очищаются предыдущие слоты
- Сбрасывается выбранное время
- Сбрасываются выбранные столы

### Условное отображение

Сетка времени показывается только если:
- Загрузка завершена (`!loadingSlots`)
- Есть доступные слоты (`slots.length > 0`)
- Выбрана дата (`formData.date`)

---

## 11. Типы данных

### Интерфейс `Slot` (`frontend/types/booking.ts`)

```typescript
export interface Slot {
  start_stamp: number;        // Unix timestamp начала
  end_stamp: number;          // Unix timestamp окончания
  duration: number;            // Длительность в секундах
  start_datetime: string;      // Дата и время начала (формат: YYYY-MM-DD HH:mm:ss)
  end_datetime: string;       // Дата и время окончания (формат: YYYY-MM-DD HH:mm:ss)
  is_free: boolean;           // Свободен ли слот
  tables_count?: number;      // Количество доступных столов
  tables_ids?: number[];      // Массив ID столов
  table_bundles?: TableBundle[] | number[][]; // Группы столов
  rooms?: Room[];             // Информация о залах
}
```

### Интерфейс `SlotsResponse`

```typescript
export interface SlotsResponse {
  success: boolean;
  data: {
    slots: Slot[];
    date: string;
    guests_count: number;
  };
}
```

---

## Заключение

Процесс загрузки сетки времени для бронирования включает:

1. **Автоматическую загрузку** при изменении даты или количества гостей
2. **Запрос к бэкенду**, который обращается к ReMarked API
3. **Фильтрацию** только свободных слотов
4. **Отображение** в виде сетки кнопок с временем и количеством столов
5. **Интерактивный выбор** с визуальной обратной связью

Все это происходит автоматически и прозрачно для пользователя, обеспечивая удобный интерфейс для выбора времени бронирования.
