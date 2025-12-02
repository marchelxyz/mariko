import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { 
  getRestaurantsFromCache, 
  setRestaurantsToCache,
  getRestaurantFromCache,
  setRestaurantToCache 
} from '../services/cacheService';
import { remarkedService } from '../services/remarkedService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Пытаемся получить из кэша
    const cached = await getRestaurantsFromCache();
    if (cached) {
      console.log('✅ Рестораны получены из кэша');
      return res.json({ success: true, data: cached, cached: true });
    }

    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    // Получаем все рестораны для отладки
    const allRestaurants = await restaurantRepository.find();
    if (process.env.NODE_ENV === 'development') {
      console.log(`Total restaurants in DB: ${allRestaurants.length}`);
      // Компактный формат для логов
      const restaurantsSummary = allRestaurants.map(r => `${r.name} (${r.city})`).join(', ');
      console.log(`All restaurants: [${restaurantsSummary}]`);
    }
    
    // Получаем только активные рестораны
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
      order: { city: 'ASC', name: 'ASC' },
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Active restaurants: ${restaurants.length}`);
      const activeSummary = restaurants.map(r => `${r.name} (${r.city})`).join(', ');
      console.log(`Active restaurants: [${activeSummary}]`);
    }
    
    // Сохраняем в кэш
    await setRestaurantsToCache(restaurants);
    
    res.json({ success: true, data: restaurants, cached: false });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Пытаемся получить из кэша
    const cached = await getRestaurantFromCache(id);
    if (cached) {
      console.log(`✅ Ресторан ${id} получен из кэша`);
      return res.json({ success: true, data: cached, cached: true });
    }

    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    
    // Сохраняем в кэш
    await setRestaurantToCache(id, restaurant);
    
    res.json({ success: true, data: restaurant, cached: false });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurant' });
  }
});

/**
 * Получение схем залов для ресторана
 * GET /restaurants/:id/hall-schemes
 */
router.get('/:id/hall-schemes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id },
      select: ['id', 'name', 'hallSchemes'], // Получаем только нужные поля
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    
    res.json({ 
      success: true, 
      data: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        hallSchemes: restaurant.hallSchemes || [],
      },
    });
  } catch (error) {
    console.error('Error fetching hall schemes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hall schemes' });
  }
});

/**
 * Синхронизация схем залов с данными из ReMarked API
 * POST /restaurants/:id/sync-hall-schemes
 * 
 * Этот endpoint получает информацию о залах и столах из ReMarked API
 * и обновляет схемы залов в базе данных.
 * 
 * Query параметры:
 * - date: string (Дата для получения слотов, формат YYYY-MM-DD) - опционально, по умолчанию сегодня
 * - guests_count: number (Количество гостей для проверки) - опционально, по умолчанию 2
 */
router.post('/:id/sync-hall-schemes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, guests_count } = req.query;
    
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id },
    });
    
    if (!restaurant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ресторан не найден' 
      });
    }
    
    if (!restaurant.remarkedPointId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ресторан не настроен для бронирования (отсутствует ReMarked Point ID)' 
      });
    }
    
    // Получаем токен от ReMarked API
    let token: string;
    try {
      const tokenResponse = await remarkedService.getToken(restaurant.remarkedPointId);
      token = tokenResponse.token;
    } catch (error: any) {
      console.error('Ошибка получения токена ReMarked:', error);
      return res.status(500).json({
        success: false,
        message: 'Не удалось подключиться к сервису бронирования',
      });
    }
    
    // Формируем период (используем переданную дату или сегодня)
    const dateStr = (date as string) || new Date().toISOString().split('T')[0];
    const period = {
      from: dateStr,
      to: dateStr,
    };
    
    const guestsCount = guests_count ? Number(guests_count) : 2;
    
    // Получаем слоты с информацией о залах и столах
    try {
      const slotsResponse = await remarkedService.getSlots(
        token,
        period,
        guestsCount,
        { with_rooms: true }
      );
      
      // Извлекаем уникальные залы и столы из всех слотов
      const roomsMap = new Map<string, { roomId: string; roomName: string; tables: Set<number> }>();
      
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
        
        // Также собираем информацию из tables_ids и table_bundles
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
          }
        }
      });
      
      // Преобразуем Map в массив схем залов
      const hallSchemes = Array.from(roomsMap.values()).map(room => ({
        roomId: room.roomId,
        roomName: room.roomName,
        tables: Array.from(room.tables).map((tableId, index) => ({
          tableId,
          tableNumber: String(index + 1), // Временный номер, можно будет обновить позже
          x: 10 + (index % 5) * 15, // Временные координаты для визуализации
          y: 10 + Math.floor(index / 5) * 15,
        })),
      }));
      
      // Обновляем схемы залов в базе данных
      restaurant.hallSchemes = hallSchemes as any;
      await restaurantRepository.save(restaurant);
      
      // Инвалидируем кеш ресторана
      await setRestaurantToCache(restaurant.id, restaurant);
      
      res.json({
        success: true,
        data: {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          hallSchemes,
          message: `Синхронизировано ${hallSchemes.length} залов с ${hallSchemes.reduce((sum, h) => sum + h.tables.length, 0)} столами`,
        },
      });
    } catch (error: any) {
      console.error('Ошибка получения слотов ReMarked:', error);
      
      if (error.code === 400) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Неверные параметры запроса',
        });
      }
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Не удалось получить данные из ReMarked API',
      });
    }
  } catch (error: any) {
    console.error('[restaurants/sync-hall-schemes] Ошибка синхронизации схем залов:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Не удалось синхронизировать схемы залов',
    });
  }
});

export default router;
