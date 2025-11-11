FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install

# Копируем код бекенда
COPY backend ./backend

# Собираем TypeScript
WORKDIR /app/backend
RUN npm run build

# Открываем порт
EXPOSE 5000

# Запускаем приложение
CMD ["npm", "start"]
