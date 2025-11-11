import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { Banner } from '../models/Banner';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';

const router = Router();

// Все админ роуты требуют аутентификации
router.use(authenticate);

// Управление баннерами
router.get('/banners', requireRole('admin', 'marketing', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.query;
    const query: any = {};
    if (restaurantId) query.restaurantId = restaurantId;
    
    const banners = await Banner.find(query).sort({ order: 1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

// Управление ролями
router.get('/users', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-__v');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.put('/users/:id/role', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// Управление изображениями блюд
router.post('/menu/images', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    // Здесь будет логика загрузки изображений
    res.json({ success: true, message: 'Image upload endpoint' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

export default router;
