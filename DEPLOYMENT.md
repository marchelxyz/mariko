# Railway deployment configuration

## Backend Deployment

1. Создайте новый проект на Railway
2. Подключите репозиторий GitHub
3. Выберите папку `backend` как root directory
4. Установите переменные окружения:
   - `MONGODB_URI` - URI подключения к MongoDB (можно использовать Railway MongoDB плагин)
   - `JWT_SECRET` - Секретный ключ для JWT (сгенерируйте случайную строку)
   - `FRONTEND_URL` - URL вашего Vercel приложения (например: https://your-app.vercel.app)
   - `PORT` - Railway установит автоматически

5. Railway автоматически определит Node.js проект и выполнит:
   - `npm install`
   - `npm run build`
   - `npm start`

## Frontend Deployment

1. Создайте новый проект на Vercel
2. Подключите репозиторий GitHub
3. Установите Root Directory как `frontend`
4. Установите переменные окружения:
   - `NEXT_PUBLIC_API_URL` - URL вашего Railway бекенда (например: https://your-backend.railway.app)

5. Vercel автоматически соберет и задеплоит Next.js приложение

## Команды для запуска на Railway

После настройки переменных окружения, Railway автоматически запустит приложение при деплое.

Для ручного запуска (если нужно):

```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm start
```
