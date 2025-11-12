import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { Banner } from '../models/Banner';
import { User, UserRole } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';

const router = Router();

// Все админ роуты требуют аутентификации
router.use(authenticate);

// Управление баннерами (только для администраторов)
router.get('/banners', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.query;
    const bannerRepository = AppDataSource.getRepository(Banner);
    
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId;
    
    const banners = await bannerRepository.find({
      where,
      order: { order: 'ASC' },
    });
    
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Error fetching admin banners:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

// Управление ролями
router.get('/users', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    
    user.role = role as UserRole;
    await userRepository.save(user);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// Управление изображениями блюд
router.post('/menu/images', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    // Здесь будет логика загрузки изображений
    res.json({ success: true, message: 'Image upload endpoint' });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

// Управление ресторанами (только для администраторов)
router.get('/restaurants', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurants = await restaurantRepository.find({
      order: { city: 'ASC', name: 'ASC' },
    });
    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
  }
});

router.post('/restaurants', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, city, address, phoneNumber } = req.body;
    
    if (!name || !city || !address || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }
    
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = restaurantRepository.create({
      name,
      city,
      address,
      phoneNumber,
      isActive: true,
    });
    
    const savedRestaurant = await restaurantRepository.save(restaurant);
    res.json({ success: true, data: savedRestaurant });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to create restaurant' });
  }
});

router.put('/restaurants/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, city, address, phoneNumber, isActive } = req.body;
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    
    if (name) restaurant.name = name;
    if (city) restaurant.city = city;
    if (address) restaurant.address = address;
    if (phoneNumber) restaurant.phoneNumber = phoneNumber;
    if (typeof isActive === 'boolean') restaurant.isActive = isActive;
    
    const updatedRestaurant = await restaurantRepository.save(restaurant);
    res.json({ success: true, data: updatedRestaurant });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to update restaurant' });
  }
});

router.delete('/restaurants/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    
    // Мягкое удаление - просто деактивируем ресторан
    restaurant.isActive = false;
    await restaurantRepository.save(restaurant);
    res.json({ success: true, message: 'Restaurant deactivated' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to delete restaurant' });
  }
});

export default router;
