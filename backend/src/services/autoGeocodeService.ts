import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { createGeocodingService } from './geocodingService';

/**
 * Автоматически геокодирует рестораны без координат при запуске приложения
 * Запускается только если есть рестораны без координат
 */
export async function autoGeocodeRestaurants() {
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
  } catch (error) {
    console.error('[AutoGeocode] ❌ Ошибка при автоматическом геокодировании:', error);
    // Не прерываем запуск приложения при ошибке геокодирования
  }
}
