import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter, authLimiter, writeLimiter } from './middleware/rateLimiter';
import { performanceMonitor, getMetrics, resetMetrics } from './middleware/performanceMonitor';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import menuRoutes from './routes/menu';
import generalMenuRoutes from './routes/generalMenu';
import bannerRoutes from './routes/banners';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import bookingRoutes from './routes/booking';
import dishImageRoutes from './routes/dishImages';
import pagesRoutes from './routes/pages';
import * as cron from 'node-cron';
import { syncAllRestaurantsMenu } from './services/syncService';
import { initializeBot, stopBot } from './services/telegramBot';
import { autoGeocodeRestaurants } from './services/autoGeocodeService';

const app = express();
const PORT: number = Number(process.env.PORT) || 5000;

// ✅ Настройка trust proxy для работы за прокси-сервером (Railway, nginx и т.д.)
// Это необходимо для правильного определения IP-адреса клиента через X-Forwarded-For
// Используем число вместо true для безопасности: доверяем только первому прокси
// Для Railway/Vercel обычно достаточно 1 прокси
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS настройки
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://mariko-azure.vercel.app',
].filter(Boolean) as string[];

// Паттерны для разрешенных доменов (например, все домены Vercel)
const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app\/.*$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения, Postman, curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Проверяем точное совпадение с разрешенными origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Проверяем паттерны (например, для Vercel доменов)
    const matchesPattern = allowedOriginPatterns.some(pattern => pattern.test(origin));
    if (matchesPattern) {
      callback(null, true);
      return;
    }

    // Если не прошло проверку - блокируем
    console.warn(`CORS: Blocked origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Логирование запросов
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// ✅ Применяем мониторинг производительности ко всем запросам
app.use(performanceMonitor);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Применяем общий rate limiter ко всем API запросам
// Health check автоматически пропускается (настроено в rateLimiter.ts)
app.use('/api', apiLimiter);

// Health check с проверкой подключения к БД и Redis
app.get('/health', async (req, res) => {
  const healthCheckStart = Date.now();
  
  try {
    const { AppDataSource } = await import('./config/database');
    const { isRedisAvailable } = await import('./config/redis');
    
    const isDbConnected = AppDataSource.isInitialized;
    let dbDetails: any = {};
    
    // Дополнительная проверка БД
    if (isDbConnected) {
      try {
        // Пробуем выполнить простой запрос для проверки работоспособности
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.query('SELECT 1');
        await queryRunner.release();
        dbDetails.status = 'connected';
        // Безопасный доступ к пулу соединений PostgreSQL
        const driver = AppDataSource.driver as any;
        if (driver.master && driver.master.pool) {
          dbDetails.activeConnections = driver.master.pool.totalCount || 0;
          dbDetails.idleConnections = driver.master.pool.idleCount || 0;
        } else {
          dbDetails.activeConnections = 0;
          dbDetails.idleConnections = 0;
        }
      } catch (dbError) {
        dbDetails.status = 'error';
        dbDetails.error = dbError instanceof Error ? dbError.message : String(dbError);
      }
    } else {
      dbDetails.status = 'disconnected';
    }
    
    const isRedisConnected = isRedisAvailable();
    const healthCheckTime = Date.now() - healthCheckStart;
    
    const health = {
      status: isDbConnected ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${healthCheckTime}ms`,
      database: {
        status: dbDetails.status,
        ...(dbDetails.activeConnections !== undefined && {
          activeConnections: dbDetails.activeConnections,
          idleConnections: dbDetails.idleConnections
        }),
        ...(dbDetails.error && { error: dbDetails.error })
      },
      redis: process.env.REDIS_URL ? {
        status: isRedisConnected ? 'connected' : 'disconnected'
      } : {
        status: 'not configured'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (!isDbConnected) {
      return res.status(503).json(health);
    }
    
    res.json(health);
  } catch (error) {
    const healthCheckTime = Date.now() - healthCheckStart;
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      responseTime: `${healthCheckTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
});

// Routes
// ✅ Строгий лимит для аутентификации (5 попыток за 15 минут)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/general-menu', generalMenuRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/pages', pagesRoutes);
// ✅ Лимит для админских операций и бронирований (20 запросов в минуту)
app.use('/api/admin', writeLimiter, adminRoutes);
app.use('/api/booking', writeLimiter, bookingRoutes);
app.use('/api/dish-images', dishImageRoutes);

// 404 handler для неизвестных маршрутов
app.use((req, res, next) => {
  // Логируем все запросы для отладки
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - 404`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    hint: 'Make sure the route starts with /api prefix'
  });
});

// Error handling
app.use(errorHandler);

// Start server
let server: any = null;

const startServer = async () => {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ЗАПУСК СЕРВЕРА');
  console.log('='.repeat(60));
  console.log(`⏰ Время запуска: ${new Date().toISOString()}`);
  console.log(`📋 Node.js версия: ${process.version}`);
  console.log(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Порт: ${PORT}`);
  
  // Логируем важные переменные окружения (без секретов)
  console.log('\n📝 Конфигурация:');
  console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`   - REDIS_URL: ${process.env.REDIS_URL ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ установлен' : '❌ не установлен'}`);
  console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL || 'не установлен'}`);
  console.log(`   - TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ установлен' : '❌ не установлен'}`);
  
  try {
    // Шаг 1: Подключение к БД
    console.log('\n📊 ШАГ 1: Подключение к базе данных...');
    const dbStartTime = Date.now();
    try {
      await connectDatabase();
      const dbTime = Date.now() - dbStartTime;
      console.log(`✅ База данных подключена за ${dbTime}ms`);
    } catch (dbError) {
      const dbTime = Date.now() - dbStartTime;
      console.error(`❌ ОШИБКА подключения к БД после ${dbTime}ms:`);
      console.error('   Детали ошибки:', dbError instanceof Error ? dbError.message : String(dbError));
      if (dbError instanceof Error && dbError.stack) {
        console.error('   Stack trace:', dbError.stack);
      }
      throw dbError; // Прерываем запуск, если БД не подключена
    }
    
    // Шаг 2: Инициализация Redis
    console.log('\n🔄 ШАГ 2: Инициализация Redis...');
    const redisStartTime = Date.now();
    try {
      const redis = getRedisClient();
      const redisTime = Date.now() - redisStartTime;
      if (redis) {
        console.log(`✅ Redis инициализирован за ${redisTime}ms`);
      } else {
        console.log(`⚠️  Redis не настроен (REDIS_URL не указан). Кэширование отключено.`);
      }
    } catch (redisError) {
      console.error('⚠️  Ошибка при инициализации Redis (не критично):', redisError);
      // Не прерываем запуск, если Redis недоступен
    }
    
    // Шаг 3: Инициализация Telegram бота
    console.log('\n🤖 ШАГ 3: Инициализация Telegram бота...');
    const botStartTime = Date.now();
    try {
      initializeBot();
      const botTime = Date.now() - botStartTime;
      console.log(`✅ Telegram бот инициализирован за ${botTime}ms`);
    } catch (botError) {
      console.error('⚠️  Ошибка при инициализации Telegram бота (не критично):', botError);
      // Не прерываем запуск, если бот не инициализирован
    }
    
    // Шаг 4: Запуск HTTP сервера
    console.log('\n🌐 ШАГ 4: Запуск HTTP сервера...');
    const serverStartTime = Date.now();
    
    server = app.listen(PORT, '0.0.0.0', () => {
      const serverTime = Date.now() - serverStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ СЕРВЕР УСПЕШНО ЗАПУЩЕН');
      console.log('='.repeat(60));
      console.log(`⏱️  Время запуска HTTP сервера: ${serverTime}ms`);
      console.log(`⏱️  Общее время запуска: ${totalTime}ms`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🌐 API endpoints: http://0.0.0.0:${PORT}/api`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('='.repeat(60) + '\n');
    });
    
    // Обработка ошибок сервера
    server.on('error', (error: NodeJS.ErrnoException) => {
      console.error('❌ ОШИБКА HTTP СЕРВЕРА:');
      console.error('   Тип ошибки:', error.code);
      console.error('   Сообщение:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.error('   ⚠️  Порт уже занят! Проверьте, не запущен ли другой процесс на порту', PORT);
      }
      process.exit(1);
    });

    // Шаг 5: Настройка синхронизации меню
    console.log('\n📅 ШАГ 5: Настройка синхронизации меню...');
    const syncSchedule = process.env.SYNC_CRON_SCHEDULE || '0 3 * * *';
    
    if (process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SHEETS_CREDENTIALS) {
      cron.schedule(syncSchedule, async () => {
        console.log(`[${new Date().toISOString()}] Запуск запланированной синхронизации меню...`);
        try {
          await syncAllRestaurantsMenu();
        } catch (error) {
          console.error('Ошибка при запланированной синхронизации:', error);
        }
      });
      console.log(`✅ Ежедневная синхронизация меню настроена на расписание: ${syncSchedule}`);
    } else {
      console.log('⚠️  Google Sheets не настроены. Синхронизация отключена.');
    }
    
    // Шаг 6: Автоматическое геокодирование (в фоне)
    console.log('\n📍 ШАГ 6: Запуск автоматического геокодирования (фоновая задача)...');
    autoGeocodeRestaurants().catch((error) => {
      console.error('⚠️  Ошибка при автоматическом геокодировании (не критично):', error);
      // Не прерываем запуск приложения при ошибке геокодирования
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('\n' + '='.repeat(60));
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ЗАПУСКЕ СЕРВЕРА');
    console.error('='.repeat(60));
    console.error(`⏱️  Время до ошибки: ${totalTime}ms`);
    console.error('📋 Тип ошибки:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('💬 Сообщение:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    
    // Дополнительная диагностика
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        console.error('\n⚠️  ДИАГНОСТИКА: Похоже на проблему с таймаутом подключения');
        console.error('   Проверьте:');
        console.error('   - Доступность базы данных');
        console.error('   - Правильность DATABASE_URL');
        console.error('   - Сетевые настройки Railway');
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connection refused')) {
        console.error('\n⚠️  ДИАГНОСТИКА: База данных недоступна');
        console.error('   Проверьте:');
        console.error('   - Запущена ли база данных PostgreSQL');
        console.error('   - Правильность хоста и порта в DATABASE_URL');
      }
      if (error.message.includes('password') || error.message.includes('authentication')) {
        console.error('\n⚠️  ДИАГНОСТИКА: Проблема с аутентификацией');
        console.error('   Проверьте:');
        console.error('   - Правильность пароля в DATABASE_URL');
        console.error('   - Права доступа пользователя БД');
      }
    }
    
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
};

// Graceful shutdown - обработка сигналов завершения
const gracefulShutdown = async (signal: string) => {
  const shutdownStart = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log(`🛑 ${signal} получен. Начало graceful shutdown...`);
  console.log('='.repeat(60));
  console.log(`⏰ Время получения сигнала: ${new Date().toISOString()}`);
  console.log(`⏱️  Uptime до shutdown: ${Math.round(process.uptime())} секунд`);
  
  const shutdownSteps: Array<{ name: string; fn: () => Promise<void> }> = [];
  
  // Шаг 1: Закрытие HTTP сервера
  if (server) {
    shutdownSteps.push({
      name: 'HTTP Server',
      fn: () => new Promise<void>((resolve) => {
        console.log('🔄 Закрытие HTTP сервера...');
        server.close(() => {
          const time = Date.now() - shutdownStart;
          console.log(`✅ HTTP сервер закрыт за ${time}ms`);
          resolve();
        });
        
        // Таймаут для закрытия сервера (5 секунд)
        setTimeout(() => {
          console.log('⚠️  Таймаут закрытия HTTP сервера');
          resolve();
        }, 5000);
      })
    });
  }
  
  // Шаг 2: Остановка Telegram бота
  shutdownSteps.push({
    name: 'Telegram Bot',
    fn: async () => {
      try {
        console.log('🔄 Остановка Telegram бота...');
        await stopBot();
        console.log('✅ Telegram бот остановлен');
      } catch (error) {
        console.error('⚠️  Ошибка при остановке Telegram бота:', error);
      }
    }
  });
  
  // Шаг 3: Закрытие Redis
  shutdownSteps.push({
    name: 'Redis',
    fn: async () => {
      try {
        console.log('🔄 Закрытие подключения к Redis...');
        const { closeRedis } = await import('./config/redis');
        await closeRedis();
        console.log('✅ Подключение к Redis закрыто');
      } catch (error) {
        console.error('⚠️  Ошибка при закрытии Redis:', error);
      }
    }
  });
  
  // Шаг 4: Закрытие БД
  shutdownSteps.push({
    name: 'Database',
    fn: async () => {
      try {
        console.log('🔄 Закрытие подключения к базе данных...');
        const { AppDataSource } = await import('./config/database');
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          console.log('✅ Подключение к базе данных закрыто');
        } else {
          console.log('ℹ️  База данных не была инициализирована');
        }
      } catch (error) {
        console.error('⚠️  Ошибка при закрытии базы данных:', error);
      }
    }
  });
  
  // Выполняем все шаги последовательно
  for (const step of shutdownSteps) {
    const stepStart = Date.now();
    try {
      await step.fn();
      const stepTime = Date.now() - stepStart;
      console.log(`   ⏱️  ${step.name}: ${stepTime}ms`);
    } catch (error) {
      console.error(`   ❌ Ошибка в шаге ${step.name}:`, error);
    }
  }
  
  const totalShutdownTime = Date.now() - shutdownStart;
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Graceful shutdown завершен за ${totalShutdownTime}ms`);
  console.log('='.repeat(60) + '\n');
  
  // Даем время на завершение операций (максимум 10 секунд)
  setTimeout(() => {
    console.log('⚠️  Принудительное завершение после таймаута');
    process.exit(0);
  }, 10000);
  
  process.exit(0);
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n' + '='.repeat(60));
  console.error('❌ UNHANDLED REJECTION');
  console.error('='.repeat(60));
  console.error('⏰ Время:', new Date().toISOString());
  console.error('📋 Promise:', promise);
  console.error('💬 Причина:', reason);
  if (reason instanceof Error && reason.stack) {
    console.error('📚 Stack trace:', reason.stack);
  }
  console.error('='.repeat(60) + '\n');
});

process.on('uncaughtException', (error) => {
  console.error('\n' + '='.repeat(60));
  console.error('❌ UNCAUGHT EXCEPTION');
  console.error('='.repeat(60));
  console.error('⏰ Время:', new Date().toISOString());
  console.error('📋 Тип ошибки:', error.constructor.name);
  console.error('💬 Сообщение:', error.message);
  if (error.stack) {
    console.error('📚 Stack trace:', error.stack);
  }
  console.error('='.repeat(60) + '\n');
  gracefulShutdown('uncaughtException');
});

// Логируем начало запуска приложения
console.log('\n' + '='.repeat(60));
console.log('🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ');
console.log('='.repeat(60));
console.log(`⏰ Время: ${new Date().toISOString()}`);
console.log(`📋 Node.js: ${process.version}`);
console.log(`🌍 Платформа: ${process.platform} ${process.arch}`);
console.log(`💾 Память: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
console.log('='.repeat(60) + '\n');

startServer();

export default app;
