import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
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
    
    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurant' });
  }
});

export default router;
