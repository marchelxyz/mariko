FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install

# Копируем код фронтенда
COPY frontend ./frontend

# Собираем Next.js приложение
WORKDIR /app/frontend
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
