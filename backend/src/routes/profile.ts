import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
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
    
    // Если у пользователя есть любимый ресторан, загружаем его полную информацию
    let favoriteRestaurant = null;
    if (user.favoriteRestaurantId) {
      favoriteRestaurant = await restaurantRepository.findOne({
        where: { id: user.favoriteRestaurantId },
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        ...user,
        favoriteRestaurant,
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
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
    
    // Если обновляется favoriteRestaurantId, проверяем существование ресторана
    if (req.body.favoriteRestaurantId !== undefined) {
      if (req.body.favoriteRestaurantId) {
        const restaurant = await restaurantRepository.findOne({
          where: { id: req.body.favoriteRestaurantId },
        });
        if (!restaurant) {
          res.status(400).json({ success: false, message: 'Restaurant not found' });
          return;
        }
      }
    }
    
    Object.assign(user, req.body);
    await userRepository.save(user);
    
    // Загружаем полную информацию о любимом ресторане, если он есть
    let favoriteRestaurant = null;
    if (user.favoriteRestaurantId) {
      favoriteRestaurant = await restaurantRepository.findOne({
        where: { id: user.favoriteRestaurantId },
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        ...user,
        favoriteRestaurant,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

export default router;
