/**
 * Простой скрипт для настройки схемы зала через API
 * Использует HTTP запросы вместо прямого доступа к БД
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const ZHUKOVSKY_POINT_ID = 203003;

async function setupHallScheme() {
  try {
    console.log('🔍 Поиск ресторана в Жуковском через API...\n');

    // Шаг 1: Найти ресторан
    const restaurantsResponse = await fetch(`${API_BASE_URL}/restaurants`);
    if (!restaurantsResponse.ok) {
      throw new Error(`Ошибка получения списка ресторанов: ${restaurantsResponse.statusText}`);
    }

    const restaurantsData = await restaurantsResponse.json();
    const restaurants = restaurantsData.data || restaurantsData;
    
    const zhukovskyRestaurant = Array.isArray(restaurants)
      ? restaurants.find((r: any) => r.city === 'Жуковский' || r.name === 'Жуковский')
      : null;

    if (!zhukovskyRestaurant) {
      console.log('⚠️  Ресторан в Жуковском не найден в базе данных');
      console.log('💡 Создайте ресторан через админ-панель или скрипт add-restaurants.ts');
      process.exit(1);
    }

    console.log(`✅ Найден ресторан: ${zhukovskyRestaurant.name} (ID: ${zhukovskyRestaurant.id})\n`);

    // Шаг 2: Установить Point ID если его нет
    if (!zhukovskyRestaurant.remarkedPointId || zhukovskyRestaurant.remarkedPointId !== ZHUKOVSKY_POINT_ID) {
      console.log(`📝 Установка Point ID: ${ZHUKOVSKY_POINT_ID}...`);
      
      // Здесь нужен PUT запрос для обновления ресторана
      // Если endpoint не реализован, пропускаем этот шаг
      console.log('⚠️  Для установки Point ID используйте админ-панель или обновите напрямую в БД');
      console.log(`   UPDATE restaurants SET "remarkedPointId" = ${ZHUKOVSKY_POINT_ID} WHERE id = '${zhukovskyRestaurant.id}';\n`);
    } else {
      console.log(`✅ Point ID уже установлен: ${zhukovskyRestaurant.remarkedPointId}\n`);
    }

    // Шаг 3: Синхронизировать схему зала
    const today = new Date().toISOString().split('T')[0];
    console.log(`📊 Синхронизация схемы зала (дата: ${today})...`);
    
    const syncUrl = `${API_BASE_URL}/restaurants/${zhukovskyRestaurant.id}/sync-hall-schemes?date=${today}&guests_count=2`;
    console.log(`   URL: ${syncUrl}\n`);

    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Ошибка синхронизации: ${syncResponse.status} - ${errorText}`);
    }

    const syncData = await syncResponse.json();
    
    console.log('✅ Схема зала успешно синхронизирована!\n');
    console.log('📊 Результат:');
    console.log(JSON.stringify(syncData, null, 2));

    if (syncData.data?.hallSchemes) {
      const hallSchemes = syncData.data.hallSchemes;
      console.log(`\n📋 Статистика:`);
      console.log(`   - Залов: ${hallSchemes.length}`);
      hallSchemes.forEach((hall: any, index: number) => {
        console.log(`   - Зал ${index + 1}: ${hall.roomName} - ${hall.tables.length} столов`);
      });
      
      // Добавляем фоновое изображение если его нет
      if (hallSchemes.length > 0 && !hallSchemes[0].imageUrl) {
        console.log(`\n💡 Добавьте фоновое изображение вручную:`);
        console.log(`   https://access.clientomer.ru/widget/203003/bg1.png`);
      }
    }

    console.log('\n🎉 Готово! Схема зала успешно применена к ресторану в Жуковском');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

setupHallScheme();
