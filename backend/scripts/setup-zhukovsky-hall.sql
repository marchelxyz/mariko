-- Скрипт для настройки схемы зала для ресторана в Жуковском
-- Выполните этот скрипт в базе данных после получения данных через API

-- Шаг 1: Найти ID ресторана в Жуковском
-- SELECT id, name, city, "remarkedPointId" FROM restaurants WHERE city = 'Жуковский' OR name = 'Жуковский';

-- Шаг 2: Установить Point ID 203003 (замените {RESTAURANT_ID} на реальный ID)
-- UPDATE restaurants SET "remarkedPointId" = 203003 WHERE id = '{RESTAURANT_ID}';

-- Шаг 3: После синхронизации через API, обновить фоновое изображение для первого зала
-- UPDATE restaurants 
-- SET "hallSchemes" = jsonb_set(
--   "hallSchemes",
--   '{0,imageUrl}',
--   '"https://access.clientomer.ru/widget/203003/bg1.png"'
-- )
-- WHERE id = '{RESTAURANT_ID}' AND "hallSchemes" IS NOT NULL AND jsonb_array_length("hallSchemes") > 0;

-- Пример полной схемы зала (замените {RESTAURANT_ID} и обновите данные о столах):
/*
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
        "x": 10,
        "y": 10,
        "capacity": 4,
        "shape": "circle",
        "width": 40,
        "height": 40
      }
    ]
  }
]'::jsonb
WHERE id = '{RESTAURANT_ID}';
*/
