# Railway deployment configuration

## Backend Deployment

1. Создайте новый проект на Railway
2. Подключите репозиторий GitHub
3. Выберите папку `backend` как root directory
4. Установите переменные окружения:
   - `DATABASE_URL` - Автоматически устанавливается при подключении PostgreSQL плагина Railway (или используйте отдельные переменные DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
   - `JWT_SECRET` - Секретный ключ для JWT (сгенерируйте случайную строку)
   - `FRONTEND_URL` - URL вашего Vercel приложения (например: https://your-app.vercel.app)
   - `PORT` - Railway установит автоматически

   **Важно:** Подключите PostgreSQL плагин в Railway - он автоматически создаст переменную `DATABASE_URL`

5. Railway автоматически определит Node.js проект и выполнит:
   - `npm install`
   - `npm run build`
   - `npm start`

## Frontend Deployment на Vercel

### Вариант 1: Через веб-интерфейс Vercel (Рекомендуется)

1. Создайте новый проект на [Vercel](https://vercel.com)
2. Подключите репозиторий GitHub
3. В настройках проекта:
   - **Root Directory**: установите `frontend`
   - **Framework Preset**: выберите `Next.js` (определится автоматически)
   - **Build Command**: оставьте по умолчанию или установите `npm run build`
   - **Output Directory**: оставьте по умолчанию `.next` или установите `.next`
   - **Install Command**: оставьте по умолчанию `npm install`

4. Установите переменные окружения в разделе **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` - URL вашего Railway бекенда (например: `https://your-backend.railway.app/api`)
     - **Важно:** URL должен заканчиваться на `/api` (например: `https://your-backend.railway.app/api`)
     - Код автоматически добавит `/api` если его нет, но лучше указать явно
     - Установите для всех окружений: Production, Preview, Development

5. Нажмите **Deploy** - Vercel автоматически соберет и задеплоит Next.js приложение

### Вариант 2: Через vercel.json (Альтернативный)

Если вы используете файл `vercel.json` в корне проекта:
- Убедитесь, что в настройках Vercel установлен **Root Directory** как `frontend`
- Файл `vercel.json` должен содержать правильные пути для сборки

### Проверка деплоя

После деплоя проверьте:
1. ✅ Приложение открывается без ошибок
2. ✅ API запросы работают (проверьте Network tab в DevTools)
3. ✅ Переменная окружения `NEXT_PUBLIC_API_URL` правильно установлена
4. ✅ Нет ошибок в консоли браузера
5. ✅ SSR работает корректно (страницы отрисовываются на сервере)

### Решение проблем

**Проблема: Белый экран или ошибка при загрузке**
- Проверьте переменную окружения `NEXT_PUBLIC_API_URL` в настройках Vercel
- Убедитесь, что бекенд доступен и отвечает на запросы
- Проверьте логи деплоя в Vercel Dashboard

**Проблема: Ошибки SSR (Server-Side Rendering)**
- Убедитесь, что все компоненты правильно обрабатывают серверный рендеринг
- Проверьте, что нет использования браузерных API (`localStorage`, `window`) на сервере
- Компоненты с браузерными API должны использовать `typeof window !== 'undefined'` или динамический импорт с `ssr: false`

**Проблема: API запросы не работают (404 ошибки)**
- Проверьте, что `NEXT_PUBLIC_API_URL` заканчивается на `/api` (например: `https://your-backend.railway.app/api`)
- Убедитесь, что все запросы используют `api` из `@/lib/api`, а не прямые вызовы `fetch` или `axios`
- Проверьте логи бекенда - там будет видно, какие маршруты запрашиваются
- Убедитесь, что бекенд запущен и доступен (проверьте `/health` endpoint)
- Проверьте CORS настройки на бекенде - убедитесь, что `FRONTEND_URL` установлен правильно

## Команды для запуска локально

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
