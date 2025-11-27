import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';
import { createGeocodingService } from '../src/services/geocodingService';

/**
 * Автоматически геокодирует рестораны без координат при запуске приложения
 * Запускается только если есть рестораны без координат
 */
async function autoGeocodeRestaurants() {
  try {
    console.log('[AutoGeocode] Проверка ресторанов без координат...');
    
    // Инициализируем подключение только если оно еще не инициализировано
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    // Получаем рестораны без координат
    const restaurantsWithoutCoords = await restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.latitude IS NULL OR restaurant.longitude IS NULL')
      .andWhere('restaurant.isActive = :isActive', { isActive: true })
      .getMany();

    if (restaurantsWithoutCoords.length === 0) {
      console.log('[AutoGeocode] ✅ Все активные рестораны имеют координаты');
      await AppDataSource.destroy();
      return;
    }

    console.log(`[AutoGeocode] Найдено ${restaurantsWithoutCoords.length} ресторанов без координат. Начинаем геокодирование...`);

    const geocodingService = createGeocodingService();
    let successCount = 0;
    let failCount = 0;

    for (const restaurant of restaurantsWithoutCoords) {
      console.log(`[AutoGeocode] Геокодирование: ${restaurant.city}, ${restaurant.address}...`);
      
      const coordinates = await geocodingService.geocodeRestaurantAddress(
        restaurant.city,
        restaurant.address
      );

      if (coordinates) {
        restaurant.latitude = coordinates.latitude;
        restaurant.longitude = coordinates.longitude;
        await restaurantRepository.save(restaurant);
        console.log(`[AutoGeocode] ✅ Координаты: ${coordinates.latitude}, ${coordinates.longitude}`);
        successCount++;
      } else {
        console.log(`[AutoGeocode] ❌ Не удалось получить координаты`);
        failCount++;
      }

      // Задержка для соблюдения rate limit Nominatim (1 запрос в секунду)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[AutoGeocode] ✅ Геокодирование завершено! Успешно: ${successCount}, Ошибок: ${failCount}`);
    
    // Не закрываем соединение, так как оно используется приложением
    // Соединение будет закрыто при остановке приложения
  } catch (error) {
    console.error('[AutoGeocode] ❌ Ошибка при автоматическом геокодировании:', error);
    // Не прерываем запуск приложения при ошибке геокодирования
  }
}

// Запускаем только если это не импорт модуля
if (require.main === module) {
  autoGeocodeRestaurants()
    .then(() => {
      console.log('[AutoGeocode] Завершено');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[AutoGeocode] Критическая ошибка:', error);
      process.exit(1);
    });
}

export { autoGeocodeRestaurants };
