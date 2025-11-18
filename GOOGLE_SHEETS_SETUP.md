# Настройка интеграции с Google Sheets

Этот документ описывает процесс настройки интеграции приложения с Google Sheets для управления меню ресторанов.

## Обзор

Приложение использует Google Sheets API для:
- Автоматического создания листа меню при создании нового ресторана
- Синхронизации меню из Google Sheets в базу данных приложения
- Ежедневной автоматической синхронизации всех ресторанов

## Структура таблицы

Каждый лист в Google Sheets должен иметь следующую структуру:

| Столбец | Название | Описание | Пример |
|---------|----------|----------|--------|
| A | ID блюда | Внутренний идентификатор блюда (уникальный в рамках ресторана) | `DISH_001` |
| B | Название блюда | Название блюда | `Пицца Маргарита` |
| C | Стоимость блюда | Цена в рублях | `450` |
| D | Калорийность блюда | Калории на порцию (опционально) | `250` |
| E | Состав блюда | Ингредиенты и описание | `Тесто, томаты, моцарелла, базилик` |
| F | ID фотографии | UUID изображения из системы управления фото | `550e8400-e29b-41d4-a716-446655440000` |
| G | Категория блюда | Категория для группировки в меню | `Пицца` |

## Настройка Google Cloud Project

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google Sheets API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google Sheets API"
   - Нажмите "Enable"

## Создание сервисного аккаунта

1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "Service Account"
3. Заполните данные:
   - Name: `mariko-sheets-service`
   - Description: `Service account for Mariko menu management`
4. Нажмите "Create and Continue"
5. Пропустите шаг "Grant this service account access to project" (нажмите "Done")
6. Откройте созданный сервисный аккаунт
7. Перейдите на вкладку "Keys"
8. Нажмите "Add Key" > "Create new key"
9. Выберите формат JSON
10. Скачайте файл с ключами

## Настройка Google Sheets

1. Создайте новую Google таблицу или используйте существующую
2. Скопируйте ID таблицы из URL:
   ```
   https://docs.google.com/spreadsheets/d/ВАШ_ID_ТАБЛИЦЫ/edit
   ```
3. Поделитесь таблицей с email сервисного аккаунта:
   - Откройте настройки доступа к таблице (кнопка "Share")
   - Добавьте email сервисного аккаунта (находится в JSON файле, поле `client_email`)
   - Дайте права "Editor" (Редактор)

## Настройка переменных окружения

Добавьте следующие переменные в файл `.env` или в настройки вашего хостинга:

```env
# ID Google таблицы (из URL)
GOOGLE_SHEETS_ID=ваш_id_таблицы

# JSON с учетными данными сервисного аккаунта (в одну строку)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Или путь к файлу с учетными данными (альтернатива)
# GOOGLE_SHEETS_CREDENTIALS_PATH=/path/to/credentials.json

# Расписание синхронизации (cron формат, по умолчанию каждый день в 3:00 UTC)
SYNC_CRON_SCHEDULE=0 3 * * *
```

### Формат GOOGLE_SHEETS_CREDENTIALS

Если вы используете переменную `GOOGLE_SHEETS_CREDENTIALS`, JSON должен быть в одну строку. Пример:

```bash
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com",...}'
```

**Важно:** Если в JSON есть переносы строк (например, в `private_key`), они должны быть экранированы как `\n`.

## Использование API

### Загрузка фото блюд

Перед заполнением Google Sheets необходимо загрузить фото блюд в систему:

```bash
POST /api/dish-images
Authorization: Bearer <token>
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg",
  "name": "Пицца Маргарита"
}
```

Или массовая загрузка:

```bash
POST /api/dish-images/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "images": [
    { "imageUrl": "https://example.com/image1.jpg", "name": "Пицца 1" },
    { "imageUrl": "https://example.com/image2.jpg", "name": "Пицца 2" }
  ]
}
```

Ответ содержит объект с полем `id` - это UUID, который нужно использовать в столбце F Google Sheets.

### Создание ресторана

При создании ресторана автоматически создается лист в Google Sheets:

```bash
POST /api/admin/restaurants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Ресторан №1",
  "city": "Москва",
  "address": "ул. Примерная, 1",
  "phoneNumber": "+7 (999) 123-45-67",
  "googleSheetId": "опционально, если отличается от GOOGLE_SHEETS_ID"
}
```

Лист будет создан автоматически с названием в формате: `НазваниеРесторана_первые8символовID`

### Ручная синхронизация меню

Для синхронизации меню конкретного ресторана:

```bash
POST /api/admin/restaurants/:restaurantId/sync
Authorization: Bearer <admin_or_manager_token>
```

Ответ:
```json
{
  "success": true,
  "message": "Синхронизация завершена",
  "data": {
    "created": 5,
    "updated": 10,
    "deleted": 2
  }
}
```

### Получение списка фото блюд

```bash
GET /api/dish-images
Authorization: Bearer <token>
```

## Автоматическая синхронизация

Приложение автоматически синхронизирует меню всех ресторанов один раз в сутки (по умолчанию в 3:00 UTC). Расписание можно изменить через переменную окружения `SYNC_CRON_SCHEDULE`.

Формат cron:
- `0 3 * * *` - каждый день в 3:00 UTC
- `0 */6 * * *` - каждые 6 часов
- `0 0 * * 0` - каждое воскресенье в полночь

## Важные замечания

1. **ID блюда (столбец A)** должен быть уникальным в рамках одного ресторана. При синхронизации блюда с одинаковым ID будут обновляться, а не создаваться заново.

2. **ID фотографии (столбец F)** должен соответствовать UUID из системы управления фото. Если ID не найден, изображение не будет привязано к блюду.

3. При удалении строки из Google Sheets, соответствующее блюдо в приложении будет помечено как недоступное (`isAvailable: false`), но не удалится полностью.

4. Название листа автоматически очищается от специальных символов и ограничивается 100 символами.

5. При создании нового ресторана, если не удалось создать лист в Google Sheets, ресторан все равно будет создан. Лист можно создать вручную и обновить поле `googleSheetName` в базе данных.

## Устранение неполадок

### Ошибка "GOOGLE_SHEETS_ID не установлен"
Убедитесь, что переменная `GOOGLE_SHEETS_ID` установлена в переменных окружения.

### Ошибка "Permission denied"
Убедитесь, что сервисный аккаунт имеет доступ к таблице с правами "Editor".

### Ошибка "Sheet not found"
Проверьте, что поле `googleSheetName` в базе данных соответствует названию листа в Google Sheets.

### Синхронизация не работает
Проверьте логи приложения на наличие ошибок. Убедитесь, что:
- Google Sheets API включен в проекте
- Учетные данные сервисного аккаунта корректны
- Таблица доступна сервисному аккаунту
