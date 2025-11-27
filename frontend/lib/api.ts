import axios from 'axios';

// Убеждаемся, что baseURL всегда заканчивается на /api
const getBaseURL = () => {
  // В production переменная NEXT_PUBLIC_API_URL должна быть установлена в Vercel Environment Variables
  // В development используем localhost по умолчанию
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  
  // Если URL не заканчивается на /api, добавляем его
  const baseURL = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  
  // Логируем используемый URL для отладки (только в development или при проблемах)
  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV === 'development' || baseURL.includes('localhost')) {
      console.log('🔗 API Base URL:', baseURL);
    }
    
    // В production предупреждаем, если используется localhost (значит переменная не установлена)
    if (baseURL.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.error('⚠️ ВНИМАНИЕ: NEXT_PUBLIC_API_URL не установлена в Vercel! Используется localhost, что не будет работать в production.');
      console.error('📝 Установите переменную окружения NEXT_PUBLIC_API_URL в настройках Vercel проекта.');
    }
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
  (response) => {
    // Логируем успешные запросы только в development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    // Детальное логирование ошибок для диагностики
    if (error.response) {
      // Сервер ответил с ошибкой
      console.error('❌ API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      console.error('❌ API Request Error: No response received', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout,
        message: error.message,
        code: error.code,
      });
      
      // Дополнительная диагностика
      if (error.code === 'ECONNREFUSED') {
        console.error('🔍 Диагностика: Соединение отклонено. Проверьте:');
        console.error('   1. Запущен ли бекенд сервер');
        console.error('   2. Правильно ли установлен NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
        console.error('   3. Доступен ли бекенд по указанному URL');
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.error('🔍 Диагностика: Таймаут запроса. Проверьте:');
        console.error('   1. Доступность бекенда');
        console.error('   2. Скорость сети');
      } else if (error.code === 'ERR_NETWORK') {
        console.error('🔍 Диагностика: Сетевая ошибка. Проверьте:');
        console.error('   1. Интернет соединение');
        console.error('   2. CORS настройки на бекенде');
        console.error('   3. URL бекенда:', error.config?.baseURL);
      }
    } else {
      // Ошибка при настройке запроса
      console.error('❌ API Error: Request setup failed', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
