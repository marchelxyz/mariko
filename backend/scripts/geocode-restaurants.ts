import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';
import { createGeocodingService } from '../src/services/geocodingService';

async function geocodeRestaurants() {
  try {
    console.log('Подключение к базе данных...');
    await AppDataSource.initialize();
    console.log('✅ Подключение к базе данных установлено');

    const geocodingService = createGeocodingService();
    const restaurantRepository = AppDataSource.getRepository(Restaurant);

    // Получаем все рестораны без координат
    const restaurants = await restaurantRepository.find({
      where: [
        { latitude: null },
        { longitude: null },
      ],
    });

    console.log(`\nНайдено ${restaurants.length} ресторанов без координат\n`);

    if (restaurants.length === 0) {
      console.log('✅ Все рестораны уже имеют координаты!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const restaurant of restaurants) {
      console.log(`Геокодирование: ${restaurant.city}, ${restaurant.address}...`);
      
      const coordinates = await geocodingService.geocodeRestaurantAddress(
        restaurant.city,
        restaurant.address
      );

      if (coordinates) {
        restaurant.latitude = coordinates.latitude;
        restaurant.longitude = coordinates.longitude;
        await restaurantRepository.save(restaurant);
        console.log(`  ✅ Координаты: ${coordinates.latitude}, ${coordinates.longitude}`);
        successCount++;
      } else {
        console.log(`  ❌ Не удалось получить координаты`);
        failCount++;
      }

      // Небольшая задержка, чтобы не превысить лимиты API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ Геокодирование завершено!`);
    console.log(`   Успешно: ${successCount}`);
    console.log(`   Ошибок: ${failCount}`);
  } catch (error) {
    console.error('❌ Ошибка при геокодировании ресторанов:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n✅ Подключение к базе данных закрыто');
    }
  }
}

geocodeRestaurants();
