import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';

const restaurants = [
  {
    name: 'Жуковский',
    city: 'Жуковский',
    address: 'Мяснищева, 1',
    phoneNumber: '+7 (495) 123-45-67', // Временный номер, можно изменить позже
  },
  {
    name: 'Калуга',
    city: 'Калуга',
    address: 'Кирова, 39, ТЦ "Европейский"',
    phoneNumber: '+7 (484) 123-45-67', // Временный номер, можно изменить позже
  },
  {
    name: 'Пенза',
    city: 'Пенза',
    address: 'с. Засечное, Прибережный, 2А',
    phoneNumber: '+7 (841) 123-45-67', // Временный номер, можно изменить позже
  },
];

async function addRestaurants() {
  try {
    console.log('Подключение к базе данных...');
    await AppDataSource.initialize();
    console.log('✅ Подключение к базе данных установлено');

    const restaurantRepository = AppDataSource.getRepository(Restaurant);

    for (const restaurantData of restaurants) {
      // Проверяем, существует ли уже ресторан с таким адресом
      const existing = await restaurantRepository.findOne({
        where: {
          city: restaurantData.city,
          address: restaurantData.address,
        },
      });

      if (existing) {
        console.log(`⚠️  Ресторан "${restaurantData.city}, ${restaurantData.address}" уже существует, пропускаем...`);
        continue;
      }

      const restaurant = restaurantRepository.create({
        ...restaurantData,
        isActive: true,
      });

      const saved = await restaurantRepository.save(restaurant);
      console.log(`✅ Добавлен ресторан: ${saved.city}, ${saved.address} (ID: ${saved.id})`);
    }

    console.log('\n✅ Все рестораны успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении ресторанов:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Подключение к базе данных закрыто');
    }
  }
}

addRestaurants();
