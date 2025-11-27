import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { MenuItem } from '../models/MenuItem';
import { GeneralMenuItem } from '../models/GeneralMenuItem';
import { Banner } from '../models/Banner';
import { DishImage } from '../models/DishImage';

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

// Определяем размер пула в зависимости от плана Railway
// Для Starter плана используем 30, для Pro - 100
// Можно переопределить через переменную окружения DB_POOL_MAX
const getPoolMax = (): number => {
  if (process.env.DB_POOL_MAX) {
    return parseInt(process.env.DB_POOL_MAX, 10);
  }
  // По умолчанию используем 30 (безопасно для Starter плана)
  // Для Pro плана установите DB_POOL_MAX=100 в переменных окружения Railway
  return 30;
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [User, Restaurant, MenuItem, GeneralMenuItem, Banner, DishImage],
  synchronize: true, // Включаем синхронизацию для автоматического создания таблиц
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  
  // ✅ Настройки пула соединений для улучшения производительности
  extra: {
    max: getPoolMax(), // Максимум соединений в пуле (30 для Starter, 100 для Pro)
    min: 5, // Минимум соединений (создаются при старте)
    idleTimeoutMillis: 30000, // Закрыть неиспользуемое соединение через 30 секунд
    connectionTimeoutMillis: 2000, // Таймаут получения соединения из пула (2 секунды)
  },
});

export const connectDatabase = async (): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Инициализация подключения к базе данных...');
    console.log('📊 Конфигурация БД:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      username: dbConfig.username,
      synchronize: true,
      ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL ? 'enabled' : 'disabled',
      poolMax: getPoolMax(),
    });
    
    // Добавляем таймаут для подключения (30 секунд)
    console.log('⏳ Попытка подключения к БД (таймаут: 30 секунд)...');
    const connectionPromise = AppDataSource.initialize();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        reject(new Error(`Database connection timeout after ${elapsed}ms (30 seconds limit)`));
      }, 30000);
    });
    
    await Promise.race([connectionPromise, timeoutPromise]);
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ PostgreSQL connected за ${connectionTime}ms`);
    console.log('📊 Настройки пула соединений:', {
      max: getPoolMax(),
      min: 5,
      idleTimeout: '30s',
      connectionTimeout: '2s',
    });
    console.log('📋 Доступные сущности:', AppDataSource.entityMetadatas.map(e => e.tableName).join(', '));
    
    // Проверяем, что таблицы созданы
    console.log('🔍 Проверка существующих таблиц в БД...');
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    const tableNames = tables.map(t => t.name);
    console.log(`🗄️  Найдено таблиц: ${tableNames.length}`);
    console.log('🗄️  Созданные таблицы в БД:', tableNames.join(', '));
    
    // Проверяем наличие таблицы users
    if (!tableNames.includes('users')) {
      console.warn('⚠️  Таблица users не найдена! TypeORM должен создать её автоматически при synchronize: true');
      // Если synchronize включен, TypeORM должен создать таблицу автоматически
      // Но на всякий случай проверим еще раз после небольшой задержки
      setTimeout(async () => {
        try {
          const checkTables = await queryRunner.getTables();
          const checkTableNames = checkTables.map(t => t.name);
          if (checkTableNames.includes('users')) {
            console.log('✅ Таблица users создана автоматически');
          } else {
            console.error('❌ Таблица users все еще не создана! Проверьте настройки synchronize');
          }
        } catch (checkError) {
          console.error('❌ Ошибка при проверке таблиц:', checkError);
        }
      }, 1000);
    } else {
      console.log('✅ Таблица users существует');
    }
    
    await queryRunner.release();
    
    // Финальная проверка работоспособности
    console.log('🔍 Финальная проверка работоспособности БД...');
    const testQueryRunner = AppDataSource.createQueryRunner();
    await testQueryRunner.query('SELECT NOW() as current_time');
    await testQueryRunner.release();
    console.log('✅ База данных полностью готова к работе');
    
  } catch (error) {
    const connectionTime = Date.now() - startTime;
    console.error(`❌ PostgreSQL connection error после ${connectionTime}ms`);
    
    if (error instanceof Error) {
      console.error('❌ Тип ошибки:', error.constructor.name);
      console.error('❌ Сообщение:', error.message);
      
      // Детальная диагностика по типу ошибки
      if (error.message.includes('timeout')) {
        console.error('\n⚠️  ДИАГНОСТИКА ТАЙМАУТА:');
        console.error('   - Проверьте доступность хоста:', dbConfig.host);
        console.error('   - Проверьте порт:', dbConfig.port);
        console.error('   - Проверьте сетевые настройки Railway');
        console.error('   - Проверьте, что PostgreSQL сервис запущен');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connection refused')) {
        console.error('\n⚠️  ДИАГНОСТИКА ОТКЛОНЕНИЯ ПОДКЛЮЧЕНИЯ:');
        console.error('   - База данных недоступна по адресу:', dbConfig.host + ':' + dbConfig.port);
        console.error('   - Проверьте, что PostgreSQL сервис запущен в Railway');
        console.error('   - Проверьте правильность DATABASE_URL');
      } else if (error.message.includes('password') || error.message.includes('authentication')) {
        console.error('\n⚠️  ДИАГНОСТИКА АУТЕНТИФИКАЦИИ:');
        console.error('   - Неверный пароль или имя пользователя');
        console.error('   - Проверьте DATABASE_URL или отдельные переменные DB_USER/DB_PASSWORD');
        console.error('   - Проверьте права доступа пользователя БД');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('\n⚠️  ДИАГНОСТИКА БАЗЫ ДАННЫХ:');
        console.error('   - База данных не существует:', dbConfig.database);
        console.error('   - Создайте базу данных или проверьте DATABASE_URL');
      } else if (error.message.includes('SSL')) {
        console.error('\n⚠️  ДИАГНОСТИКА SSL:');
        console.error('   - Проблема с SSL соединением');
        console.error('   - Проверьте настройки SSL в DATABASE_URL');
        console.error('   - Убедитесь, что DB_SSL=true или DATABASE_URL содержит SSL параметры');
      }
      
      if (error.stack) {
        console.error('\n📚 Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('❌ Неизвестная ошибка:', error);
    }
    
    throw error;
  }
};
