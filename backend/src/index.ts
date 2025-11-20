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
import bannerRoutes from './routes/banners';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import bookingRoutes from './routes/booking';
import dishImageRoutes from './routes/dishImages';
import * as cron from 'node-cron';
import { syncAllRestaurantsMenu } from './services/syncService';

const app = express();
const PORT: number = Number(process.env.PORT) || 5000;

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
  try {
    const { AppDataSource } = await import('./config/database');
    const { isRedisAvailable } = await import('./config/redis');
    
    const isDbConnected = AppDataSource.isInitialized;
    const isRedisConnected = isRedisAvailable();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
      redis: process.env.REDIS_URL ? (isRedisConnected ? 'connected' : 'disconnected') : 'not configured'
    };
    
    if (!isDbConnected) {
      return res.status(503).json({ 
        ...health,
        status: 'unhealthy'
      });
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
// ✅ Строгий лимит для аутентификации (5 попыток за 15 минут)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/profile', profileRoutes);
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
  try {
    await connectDatabase();
    
    // Инициализируем Redis (если настроен)
    const redis = getRedisClient();
    if (redis) {
      console.log('🔄 Инициализация Redis...');
    } else {
      console.log('⚠️  Redis не настроен (REDIS_URL не указан). Кэширование отключено.');
    }
    
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check available at http://localhost:${PORT}/health`);
      console.log(`🌐 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Настройка ежедневной синхронизации меню из Google Sheets
    // Запускается каждый день в 3:00 утра по UTC
    // Можно изменить расписание через переменную окружения SYNC_CRON_SCHEDULE
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
      console.log(`📅 Ежедневная синхронизация меню настроена на расписание: ${syncSchedule}`);
    } else {
      console.log('⚠️  Google Sheets не настроены. Синхронизация отключена.');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown - обработка сигналов завершения
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
  }
  
  // Закрываем подключение к Redis
  try {
    const { closeRedis } = await import('./config/redis');
    await closeRedis();
  } catch (error) {
    console.error('Error closing Redis:', error);
  }
  
  // Закрываем подключение к БД
  try {
    const { AppDataSource } = await import('./config/database');
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  // Даем время на завершение операций (максимум 10 секунд)
  setTimeout(() => {
    console.log('⚠️  Forced shutdown after timeout');
    process.exit(0);
  }, 10000);
  
  process.exit(0);
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

startServer();

export default app;
