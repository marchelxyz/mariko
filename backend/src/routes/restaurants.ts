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

export default router;
