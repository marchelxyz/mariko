# Railway Configuration Guide

## Важно: Настройка Root Directory в Railway

Для правильной работы бекенда на Railway нужно:

1. **В настройках Railway проекта установите:**
   - **Root Directory**: `backend`
   - **Builder**: NIXPACKS (автоматически)

2. **Railway автоматически:**
   - Найдет `package.json` в директории `backend/`
   - Выполнит `npm install`
   - Выполнит `npm run build` (из package.json)
   - Запустит `npm start` (из package.json)

3. **Переменные окружения:**
   - `DATABASE_URL` - автоматически от PostgreSQL плагина
   - `JWT_SECRET` - ваш секретный ключ
   - `FRONTEND_URL` - URL вашего Vercel приложения
   - `PORT` - устанавливается автоматически

## Если Root Directory установлен как `backend`:

Railway будет работать напрямую из директории `backend/`, поэтому:
- Не нужно `cd backend` в командах
- Все команды выполняются относительно `backend/`
- `package.json` находится в текущей директории

## Альтернатива (если Root Directory = корень проекта):

Если Railway настроен на корень проекта, используйте команды:
- Build: `cd backend && npm install && npm run build`
- Start: `cd backend && npm start`

Но **рекомендуется** установить Root Directory = `backend` для упрощения конфигурации.
