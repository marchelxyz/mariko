import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// ✅ Общий rate limiter для всех API запросов
// Настройки можно переопределить через переменные окружения
const getApiMaxRequests = (): number => {
  if (process.env.RATE_LIMIT_API_MAX) {
    return parseInt(process.env.RATE_LIMIT_API_MAX, 10);
  }
  // По умолчанию: 100 запросов за 15 минут (безопасно для Starter плана)
  // Для Pro плана можно установить RATE_LIMIT_API_MAX=200
  return 100;
};

// ✅ Функция для безопасного извлечения IP адреса с поддержкой IPv6 и trust proxy
const getClientIp = (req: Request): string => {
  // Получаем IP из заголовков (если используется trust proxy)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.socket.remoteAddress || req.ip || 'unknown';
  
  // Обработка IPv6 адресов (упрощенная версия)
  // Если это IPv6, используем первые 64 бита (первые 4 группы) для группировки
  if (ip.includes(':')) {
    const parts = ip.split(':');
    // Возвращаем первые 4 группы IPv6 адреса для группировки похожих адресов
    return parts.slice(0, 4).join(':');
  }
  
  return ip;
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: getApiMaxRequests(), // Максимум запросов за окно времени
  message: {
    success: false,
    error: {
      message: 'Слишком много запросов с этого IP, попробуйте позже через 15 минут',
    },
  },
  standardHeaders: true, // Возвращает информацию о лимитах в заголовках (X-RateLimit-*)
  legacyHeaders: false, // Отключает заголовки Retry-After
  // Пропускаем успешные health check запросы и preflight (OPTIONS) запросы
  skip: (req) => req.path === '/health' || req.method === 'OPTIONS',
  // ✅ Безопасная настройка для работы с trust proxy и IPv6
  keyGenerator: getClientIp,
});

// ✅ Строгий rate limiter для аутентификации
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // Максимум 5 попыток входа за 15 минут
  message: {
    success: false,
    error: {
      message: 'Слишком много попыток входа, попробуйте позже через 15 минут',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не считать успешные запросы (если вход успешен, не блокируем)
  // ✅ Безопасная настройка для работы с trust proxy и IPv6
  keyGenerator: getClientIp,
});

// ✅ Rate limiter для тяжелых операций (создание/обновление)
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // Максимум 20 запросов в минуту
  message: {
    success: false,
    error: {
      message: 'Слишком много операций записи, попробуйте позже',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Безопасная настройка для работы с trust proxy и IPv6
  keyGenerator: getClientIp,
});
