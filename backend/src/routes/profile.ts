import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { authenticate, AuthRequest } from '../middleware/auth';
import { invalidateHomePageCache, invalidateUserCache } from '../services/cacheService';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.userId! },
    });
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.userId! },
    });
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    Object.assign(user, req.body);
    await userRepository.save(user);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Получить любимый ресторан пользователя
router.get('/favorite-restaurant', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    const user = await userRepository.findOne({
      where: { id: req.userId! },
    });
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    if (!user.favoriteRestaurantId) {
      res.json({ success: true, data: null });
      return;
    }
    
    const restaurant = await restaurantRepository.findOne({
      where: { id: user.favoriteRestaurantId },
    });
    
    if (!restaurant) {
      // Если ресторан не найден, очищаем ссылку
      user.favoriteRestaurantId = undefined;
      await userRepository.save(user);
      
      // Инвалидируем кеш главной страницы и кеш пользователя
      await invalidateHomePageCache();
      await invalidateUserCache(user.id);
      
      res.json({ success: true, data: null });
      return;
    }
    
    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error fetching favorite restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorite restaurant' });
  }
});

// Установить любимый ресторан
router.put('/favorite-restaurant', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    const { restaurantId } = req.body;
    
    const user = await userRepository.findOne({
      where: { id: req.userId! },
    });
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    // Если restaurantId не передан или null, убираем любимый ресторан
    if (!restaurantId) {
      user.favoriteRestaurantId = undefined;
      await userRepository.save(user);
      
      // Инвалидируем кеш главной страницы и кеш пользователя
      await invalidateHomePageCache();
      await invalidateUserCache(user.id);
      
      res.json({ success: true, data: null });
      return;
    }
    
    // Проверяем существование ресторана
    const restaurant = await restaurantRepository.findOne({
      where: { id: restaurantId },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    
    // Если это тот же ресторан, что уже выбран, убираем его из избранного
    if (user.favoriteRestaurantId === restaurantId) {
      user.favoriteRestaurantId = undefined;
      await userRepository.save(user);
      
      // Инвалидируем кеш главной страницы и кеш пользователя
      await invalidateHomePageCache();
      await invalidateUserCache(user.id);
      
      res.json({ success: true, data: null });
      return;
    }
    
    user.favoriteRestaurantId = restaurantId;
    await userRepository.save(user);
    
    // Инвалидируем кеш главной страницы и кеш пользователя при изменении избранного ресторана
    await invalidateHomePageCache();
    await invalidateUserCache(user.id);
    
    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error setting favorite restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to set favorite restaurant' });
  }
});

export default router;
