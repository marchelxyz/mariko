# Ручная настройка схемы зала для ресторана в Жуковском

## Вариант 1: Через API (рекомендуется)

### Предварительные требования:
1. Сервер должен быть запущен
2. Ресторан должен существовать в базе данных

### Шаги:

1. **Найти ID ресторана:**
```bash
curl http://localhost:3000/api/restaurants | jq '.data[] | select(.city == "Жуковский" or .name == "Жуковский")'
```

2. **Установить Point ID (если еще не установлен):**
   - Через админ-панель: Рестораны → Жуковский → Установить `remarkedPointId = 203003`
   - Или через SQL:
   ```sql
   UPDATE restaurants SET "remarkedPointId" = 203003 WHERE city = 'Жуковский';
   ```

3. **Синхронизировать схему зала:**
```bash
# Замените {RESTAURANT_ID} на реальный ID ресторана
curl -X POST "http://localhost:3000/api/restaurants/{RESTAURANT_ID}/sync-hall-schemes?date=2024-12-20&guests_count=2"
```

4. **Добавить фоновое изображение (если не добавилось автоматически):**
```sql
UPDATE restaurants 
SET "hallSchemes" = jsonb_set(
  "hallSchemes",
  '{0,imageUrl}',
  '"https://access.clientomer.ru/widget/203003/bg1.png"'
)
WHERE "remarkedPointId" = 203003 
  AND "hallSchemes" IS NOT NULL 
  AND jsonb_array_length("hallSchemes") > 0;
```

## Вариант 2: Прямой SQL (если API недоступен)

1. **Найти ресторан:**
```sql
SELECT id, name, city, "remarkedPointId" 
FROM restaurants 
WHERE city = 'Жуковский' OR name = 'Жуковский';
```

2. **Установить Point ID:**
```sql
UPDATE restaurants 
SET "remarkedPointId" = 203003 
WHERE city = 'Жуковский' OR name = 'Жуковский';
```

3. **Получить данные о столах через ReMarked API:**
   - Используйте Postman или curl для запроса к ReMarked API
   - Или используйте скрипт для получения токена и слотов

4. **Вставить схему зала:**
```sql
-- Замените {RESTAURANT_ID} на реальный ID
-- Замените данные о столах на реальные из API
UPDATE restaurants 
SET "hallSchemes" = '[
  {
    "roomId": "1",
    "roomName": "Основной зал",
    "imageUrl": "https://access.clientomer.ru/widget/203003/bg1.png",
    "tables": [
      {
        "tableId": 330,
        "tableNumber": "330",
        "x": 15,
        "y": 20,
        "capacity": 4,
        "shape": "circle",
        "width": 40,
        "height": 40
      }
      -- Добавьте другие столы здесь
    ]
  }
]'::jsonb
WHERE id = '{RESTAURANT_ID}';
```

## Вариант 3: Использование скрипта после исправления проблемы с tsx

После исправления проблемы с TypeORM декораторами:

```bash
cd backend
npm run setup-zhukovsky-hall
```

## Проверка результата

После настройки проверьте:

```sql
SELECT 
  id, 
  name, 
  "remarkedPointId",
  jsonb_array_length("hallSchemes") as halls_count,
  "hallSchemes"
FROM restaurants 
WHERE "remarkedPointId" = 203003;
```

Или через API:
```bash
curl http://localhost:3000/api/restaurants/{RESTAURANT_ID}/hall-schemes
```

## Важные замечания

1. **Координаты столов**: После автоматической синхронизации координаты будут временными. Их нужно настроить вручную через админ-панель.

2. **ID столов**: Должны совпадать с ID из ReMarked API для корректной работы бронирования.

3. **Фоновое изображение**: Убедитесь, что изображение доступно по URL `https://access.clientomer.ru/widget/203003/bg1.png`
