/**
 * Настройка схемы зала для ресторана в Жуковском
 * 
 * Этот скрипт:
 * 1. Находит ресторан в Жуковском
 * 2. Устанавливает Point ID 203003 если его нет
 * 3. Получает данные о столах через ReMarked API
 * 4. Применяет схему зала с фоновым изображением из виджета
 */

// Импорт reflect-metadata должен быть самым первым!
import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

// Импорты после reflect-metadata
import { AppDataSource } from '../src/config/database';
import { Restaurant } from '../src/models/Restaurant';
import { remarkedService } from '../src/services/remarkedService';

const ZHUKOVSKY_POINT_ID = 203003;
const BACKGROUND_IMAGE = 'https://access.clientomer.ru/widget/203003/bg1.png';

async function setupHallScheme() {
  try {
    console.log('🔌 Подключение к базе данных...');
    await AppDataSource.initialize();
    console.log('✅ Подключено к базе данных\n');

    const restaurantRepository = AppDataSource.getRepository(Restaurant);

    // Ищем ресторан в Жуковском
    console.log('🔍 Поиск ресторана в Жуковском...');
    let restaurant = await restaurantRepository.findOne({
      where: [
        { city: 'Жуковский' },
        { name: 'Жуковский' },
      ],
    });

    if (!restaurant) {
      console.log('⚠️  Ресторан в Жуковском не найден в базе данных');
      console.log('💡 Создайте ресторан через админ-панель или скрипт add-restaurants.ts');
      process.exit(1);
    }

    console.log(`✅ Найден ресторан: ${restaurant.name} (ID: ${restaurant.id})\n`);

    // Проверяем и устанавливаем Point ID
    if (!restaurant.remarkedPointId || restaurant.remarkedPointId !== ZHUKOVSKY_POINT_ID) {
      console.log(`📝 Установка Point ID: ${ZHUKOVSKY_POINT_ID}...`);
      restaurant.remarkedPointId = ZHUKOVSKY_POINT_ID;
      await restaurantRepository.save(restaurant);
      console.log('✅ Point ID установлен\n');
    } else {
      console.log(`✅ Point ID уже установлен: ${restaurant.remarkedPointId}\n`);
    }

    // Получаем токен от ReMarked API
    console.log('🔑 Получение токена от ReMarked API...');
    let token: string;
    try {
      const tokenResponse = await remarkedService.getToken(ZHUKOVSKY_POINT_ID);
      token = tokenResponse.token;
      console.log('✅ Токен получен\n');
    } catch (error: any) {
      console.error('❌ Ошибка получения токена:', error.message);
      process.exit(1);
    }

    // Получаем слоты с информацией о залах и столах
    console.log('📊 Получение данных о залах и столах...');
    const today = new Date().toISOString().split('T')[0];
    const period = {
      from: today,
      to: today,
    };

    try {
      const slotsResponse = await remarkedService.getSlots(
        token,
        period,
        2, // 2 гостя для проверки
        { with_rooms: true }
      );

      console.log(`✅ Получено ${slotsResponse.slots.length} слотов\n`);

      // Извлекаем уникальные залы и столы
      const roomsMap = new Map<string, { 
        roomId: string; 
        roomName: string; 
        tables: Set<number> 
      }>();

      // Обрабатываем каждый слот
      slotsResponse.slots.forEach(slot => {
        // Если в ответе есть rooms, используем их
        if (slot.rooms && Array.isArray(slot.rooms)) {
          slot.rooms.forEach((room: any) => {
            const roomId = String(room.room_id || room.id || '');
            const roomName = room.room_name || room.name || `Зал ${roomId}`;
            
            if (!roomsMap.has(roomId)) {
              roomsMap.set(roomId, {
                roomId,
                roomName,
                tables: new Set<number>(),
              });
            }
            
            // Добавляем столы из этого зала
            if (room.tables && Array.isArray(room.tables)) {
              room.tables.forEach((tableId: number) => {
                roomsMap.get(roomId)!.tables.add(tableId);
              });
            }
          });
        }
        
        // Также собираем информацию из tables_ids
        if (slot.tables_ids && Array.isArray(slot.tables_ids)) {
          // Если нет информации о залах, создаем общий зал
          if (roomsMap.size === 0) {
            const defaultRoomId = '1';
            if (!roomsMap.has(defaultRoomId)) {
              roomsMap.set(defaultRoomId, {
                roomId: defaultRoomId,
                roomName: 'Основной зал',
                tables: new Set<number>(),
              });
            }
            slot.tables_ids.forEach((tableId: number) => {
              roomsMap.get(defaultRoomId)!.tables.add(tableId);
            });
          } else {
            // Добавляем столы к существующим залам
            slot.tables_ids.forEach((tableId: number) => {
              // Пытаемся найти зал, которому принадлежит стол
              // Если не находим, добавляем в первый зал
              const firstRoom = Array.from(roomsMap.values())[0];
              if (firstRoom) {
                firstRoom.tables.add(tableId);
              }
            });
          }
        }
      });

      // Преобразуем Map в массив схем залов
      const hallSchemes = Array.from(roomsMap.values()).map((room, roomIndex) => {
        const tables = Array.from(room.tables);
        
        return {
          roomId: room.roomId,
          roomName: room.roomName,
          imageUrl: roomIndex === 0 ? BACKGROUND_IMAGE : undefined, // Фоновое изображение только для первого зала
          tables: tables.map((tableId, index) => ({
            tableId,
            tableNumber: String(tableId), // Используем ID стола как номер
            // Временные координаты - их можно будет настроить вручную через админ-панель
            x: 10 + (index % 6) * 13,
            y: 10 + Math.floor(index / 6) * 15,
            capacity: undefined, // Можно получить из API если доступно
            shape: 'circle' as const,
            width: 40,
            height: 40,
          })),
        };
      });

      console.log('📋 Сформирована схема зала:');
      hallSchemes.forEach((hall, index) => {
        console.log(`   Зал ${index + 1}: ${hall.roomName} - ${hall.tables.length} столов`);
      });
      console.log('');

      // Обновляем схемы залов в базе данных
      console.log('💾 Сохранение схемы зала в базу данных...');
      restaurant.hallSchemes = hallSchemes as any;
      await restaurantRepository.save(restaurant);
      console.log('✅ Схема зала сохранена\n');

      console.log('🎉 Готово! Схема зала успешно применена к ресторану в Жуковском');
      console.log(`\n📊 Статистика:`);
      console.log(`   - Залов: ${hallSchemes.length}`);
      console.log(`   - Всего столов: ${hallSchemes.reduce((sum, h) => sum + h.tables.length, 0)}`);
      console.log(`   - Фоновое изображение: ${BACKGROUND_IMAGE}`);
      console.log(`\n💡 Примечание: Координаты столов установлены автоматически.`);
      console.log(`   Для точной настройки используйте админ-панель или обновите координаты вручную.`);

    } catch (error: any) {
      console.error('❌ Ошибка получения слотов:', error.message);
      if (error.code === 400) {
        console.error('   Возможно, указана неверная дата или параметры запроса');
      }
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Соединение с базой данных закрыто');
    }
  }
}

// Запуск скрипта
setupHallScheme();
