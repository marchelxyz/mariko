import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/config/database';
import { autoGeocodeRestaurants } from '../src/services/autoGeocodeService';

// Запускаем только если это не импорт модуля
if (require.main === module) {
  (async () => {
    try {
      // Инициализируем подключение к БД для скрипта
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      
      await autoGeocodeRestaurants();
      
      // Закрываем соединение после завершения скрипта
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      
      console.log('[AutoGeocode] Завершено');
      process.exit(0);
    } catch (error) {
      console.error('[AutoGeocode] Критическая ошибка:', error);
      process.exit(1);
    }
  })();
}
