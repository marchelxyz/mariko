import Redis from 'ioredis';

let redis: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  // Если Redis URL не настроен, возвращаем null (кэширование отключено)
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        enableOfflineQueue: false,
      });

      redis.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
        // Не падаем, если Redis недоступен - просто логируем ошибку
      });

      redis.on('connect', () => {
        console.log('🔄 Подключение к Redis...');
      });

      redis.on('ready', () => {
        console.log('✅ Redis подключен и готов к работе');
      });

      redis.on('close', () => {
        console.log('⚠️  Redis соединение закрыто');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Переподключение к Redis...');
      });
    } catch (error) {
      console.error('❌ Ошибка при создании Redis клиента:', error);
      return null;
    }
  }

  return redis;
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.quit();
      console.log('✅ Redis соединение закрыто');
      redis = null;
    } catch (error) {
      console.error('❌ Ошибка при закрытии Redis:', error);
    }
  }
};

// Проверка доступности Redis
export const isRedisAvailable = (): boolean => {
  const client = getRedisClient();
  return client !== null && client.status === 'ready';
};
