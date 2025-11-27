import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { 
  getRestaurantsFromCache, 
  setRestaurantsToCache,
  getRestaurantFromCache,
  setRestaurantToCache 
} from '../services/cacheService';

const router = Router();

/**
 * Вычисляет расстояние между двумя точками на Земле по формуле гаверсинуса
 * @param lat1 Широта первой точки
 * @param lon1 Долгота первой точки
 * @param lat2 Широта второй точки
 * @param lon2 Долгота второй точки
 * @returns Расстояние в километрах
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Радиус Земли в километрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
    console.log(`Total restaurants in DB: ${allRestaurants.length}`);
    console.log('All restaurants:', allRestaurants.map(r => ({ id: r.id, name: r.name, city: r.city, isActive: r.isActive })));
    
    // Получаем только активные рестораны
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
      order: { city: 'ASC', name: 'ASC' },
    });
    
    console.log(`Active restaurants: ${restaurants.length}`);
    console.log('Active restaurants:', restaurants.map(r => ({ id: r.id, name: r.name, city: r.city })));
    
    // Сохраняем в кэш
    await setRestaurantsToCache(restaurants);
    
    res.json({ success: true, data: restaurants, cached: false });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
  }
});

/**
 * GET /api/restaurants/nearest?latitude=...&longitude=...
 * Находит ближайший ресторан к указанным координатам
 */
router.get('/nearest', async (req: Request, res: Response) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Необходимо указать latitude и longitude' 
      });
    }

    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    // Получаем все активные рестораны с координатами
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
    });

    // Фильтруем рестораны с координатами и вычисляем расстояние
    const restaurantsWithDistance = restaurants
      .filter(r => r.latitude != null && r.longitude != null)
      .map(restaurant => {
        const distance = calculateDistance(
          latitude,
          longitude,
          Number(restaurant.latitude),
          Number(restaurant.longitude)
        );
        return {
          restaurant,
          distance,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    if (restaurantsWithDistance.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Не найдено ресторанов с координатами' 
      });
    }

    const nearest = restaurantsWithDistance[0];
    
    res.json({ 
      success: true, 
      data: {
        restaurant: nearest.restaurant,
        distance: Math.round(nearest.distance * 10) / 10, // Округляем до 1 знака после запятой
      }
    });
  } catch (error) {
    console.error('Error finding nearest restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to find nearest restaurant' });
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

export default router;
