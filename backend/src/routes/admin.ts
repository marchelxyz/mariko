import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { Banner } from '../models/Banner';
import { User, UserRole } from '../models/User';
import { MenuItem } from '../models/MenuItem';

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

export default router;
