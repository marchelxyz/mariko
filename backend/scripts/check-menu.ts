import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';
import { MenuItem } from '../src/models/MenuItem';
import { DishImage } from '../src/models/DishImage';
import { In } from 'typeorm';

async function checkMenu() {
  try {
    console.log('🔍 Подключение к базе данных...');
    await AppDataSource.initialize();
    console.log('✅ Подключено к БД\n');

    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    const dishImageRepository = AppDataSource.getRepository(DishImage);

    // Получаем все рестораны
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
      order: { city: 'ASC', name: 'ASC' },
    });

    console.log(`📊 Найдено активных ресторанов: ${restaurants.length}\n`);

    if (restaurants.length === 0) {
      console.log('❌ Нет активных ресторанов в БД');
      await AppDataSource.destroy();
      return;
    }

    // Проверяем меню для каждого ресторана
    for (const restaurant of restaurants) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🍽️  Ресторан: ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Город: ${restaurant.city}`);
      console.log(`   Адрес: ${restaurant.address}`);
      console.log(`   Активен: ${restaurant.isActive ? '✅' : '❌'}`);

      // Получаем все блюда (включая недоступные для диагностики)
      const allMenuItems = await menuItemRepository.find({
        where: { restaurantId: restaurant.id },
        order: { category: 'ASC', name: 'ASC' },
      });

      // Получаем только доступные блюда
      const availableMenuItems = await menuItemRepository.find({
        where: { restaurantId: restaurant.id, isAvailable: true },
        order: { category: 'ASC', name: 'ASC' },
      });

      console.log(`\n   📋 Всего блюд в БД: ${allMenuItems.length}`);
      console.log(`   ✅ Доступных блюд: ${availableMenuItems.length}`);
      console.log(`   ❌ Недоступных блюд: ${allMenuItems.length - availableMenuItems.length}`);

      if (availableMenuItems.length === 0) {
        console.log(`   ⚠️  ВНИМАНИЕ: Нет доступных блюд для этого ресторана!`);
        continue;
      }

      // Группируем по категориям
      const groupedByCategory = availableMenuItems.reduce((acc: any, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});

      const categories = Object.keys(groupedByCategory);
      console.log(`\n   📂 Категории (${categories.length}):`);
      categories.forEach((category) => {
        const items = groupedByCategory[category];
        console.log(`      - ${category}: ${items.length} блюд`);
      });

      // Проверяем изображения
      const dishImageIds = availableMenuItems
        .map(item => item.dishImageId)
        .filter((id): id is string => !!id);

      if (dishImageIds.length > 0) {
        const dishImages = await dishImageRepository.find({
          where: { id: In(dishImageIds) },
        });
        console.log(`\n   🖼️  Изображений в DishImage: ${dishImages.length} из ${dishImageIds.length} запрошенных`);
      }

      // Проверяем наличие imageUrl
      const itemsWithImageUrl = availableMenuItems.filter(item => item.imageUrl || item.dishImageId);
      console.log(`   🖼️  Блюд с изображениями: ${itemsWithImageUrl.length} из ${availableMenuItems.length}`);

      // Проверяем обязательные поля
      const itemsWithMissingFields = availableMenuItems.filter(item => 
        !item.name || !item.price || !item.category
      );
      if (itemsWithMissingFields.length > 0) {
        console.log(`\n   ⚠️  Блюда с отсутствующими полями: ${itemsWithMissingFields.length}`);
        itemsWithMissingFields.forEach(item => {
          const missing = [];
          if (!item.name) missing.push('name');
          if (!item.price) missing.push('price');
          if (!item.category) missing.push('category');
          console.log(`      - ${item.id}: отсутствуют ${missing.join(', ')}`);
        });
      }

      // Показываем примеры блюд
      console.log(`\n   📝 Примеры блюд:`);
      const sampleItems = availableMenuItems.slice(0, 3);
      sampleItems.forEach(item => {
        console.log(`      - ${item.name} (${item.category}): ${item.price} ₽`);
        if (item.description) {
          const desc = item.description.length > 50 
            ? item.description.substring(0, 50) + '...' 
            : item.description;
          console.log(`        Описание: ${desc}`);
        }
      });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Диагностика завершена\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
    if (error instanceof Error) {
      console.error('Сообщение:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

checkMenu();
