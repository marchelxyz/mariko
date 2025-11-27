import axios from 'axios';

// Убеждаемся, что baseURL всегда заканчивается на /api
const getBaseURL = () => {
  // В production переменная NEXT_PUBLIC_API_URL должна быть установлена в Vercel Environment Variables
  // В development используем localhost по умолчанию
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  // Если URL не заканчивается на /api, добавляем его
  const baseURL = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  
  // В production предупреждаем, если используется localhost (значит переменная не установлена)
  if (typeof window !== 'undefined' && baseURL.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.error('⚠️ ВНИМАНИЕ: NEXT_PUBLIC_API_URL не установлена в Vercel! Используется localhost, что не будет работать в production.');
    console.error('📝 Установите переменную окружения NEXT_PUBLIC_API_URL в настройках Vercel проекта.');
  }
  
  return baseURL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 секунд таймаут (увеличено для больших меню)
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const { secureStorage, STORAGE_KEYS } = await import('./storage');
      const token = await secureStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Fallback на localStorage для обратной совместимости
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Сервер ответил с ошибкой
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error('API Request Error: No response received');
    } else {
      // Ошибка при настройке запроса
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
