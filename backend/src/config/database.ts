import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { Banner } from '../models/Banner';

// Парсинг DATABASE_URL от Railway или использование отдельных переменных
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    // Railway предоставляет DATABASE_URL в формате: postgresql://user:password@host:port/dbname
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // убираем первый слэш
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mariko',
  };
};

const dbConfig = getDatabaseConfig();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [User, Restaurant, MenuItem, Banner],
  synchronize: true, // Включаем синхронизацию для автоматического создания таблиц
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Инициализация подключения к базе данных...');
    console.log('📊 Конфигурация БД:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      synchronize: true,
    });
    
    await AppDataSource.initialize();
    console.log('✅ PostgreSQL connected');
    console.log('📋 Доступные таблицы:', AppDataSource.entityMetadatas.map(e => e.tableName).join(', '));
    
    // Проверяем, что таблицы созданы
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    console.log('🗄️  Созданные таблицы в БД:', tables.map(t => t.name).join(', '));
    await queryRunner.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    if (error instanceof Error) {
      console.error('❌ Детали ошибки:', error.message);
      console.error('❌ Stack trace:', error.stack);
    }
    throw error;
  }
};
