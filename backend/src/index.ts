import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import menuRoutes from './routes/menu';
import bannerRoutes from './routes/banners';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';
import bookingRoutes from './routes/booking';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check с проверкой подключения к БД
app.get('/health', async (req, res) => {
  try {
    const { AppDataSource } = await import('./config/database');
    const isDbConnected = AppDataSource.isInitialized;
    
    if (isDbConnected) {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/booking', bookingRoutes);

// Error handling
app.use(errorHandler);

// Start server
let server: any = null;

const startServer = async () => {
  try {
    await connectDatabase();
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check available at http://localhost:${PORT}/health`);
    });
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
