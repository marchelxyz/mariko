import rateLimit from 'express-rate-limit';

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

// ✅ Примечание: Не указываем keyGenerator явно
// express-rate-limit по умолчанию использует встроенный ipKeyGenerator,
// который правильно обрабатывает IPv6 адреса и учитывает trust proxy настройки Express
// Поскольку trust proxy настроен в index.ts, Express автоматически обрабатывает X-Forwarded-For
// и устанавливает req.ip правильно, что используется встроенным ipKeyGenerator

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
  // ✅ Не указываем keyGenerator - используем встроенный ipKeyGenerator по умолчанию
  // который правильно обрабатывает IPv6 и учитывает trust proxy настройки
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
  // ✅ Не указываем keyGenerator - используем встроенный ipKeyGenerator по умолчанию
  // который правильно обрабатывает IPv6 и учитывает trust proxy настройки
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
  // ✅ Не указываем keyGenerator - используем встроенный ipKeyGenerator по умолчанию
  // который правильно обрабатывает IPv6 и учитывает trust proxy настройки
});
