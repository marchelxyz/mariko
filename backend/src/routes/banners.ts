import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Banner } from '../models/Banner';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId, type } = req.query;
    const bannerRepository = AppDataSource.getRepository(Banner);
    
    const where: any = { isActive: true };
    if (restaurantId) {
      where.restaurantId = restaurantId;
    } else {
      where.restaurantId = null;
    }
    
    // Фильтрация по типу баннера (horizontal или vertical)
    if (type) {
      where.type = type;
    }

    const banners = await bannerRepository.find({
      where,
      order: { order: 'ASC' },
    });
    
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const bannerRepository = AppDataSource.getRepository(Banner);
    const banner = bannerRepository.create(req.body);
    await bannerRepository.save(banner);
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
});

router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const bannerRepository = AppDataSource.getRepository(Banner);
    const banner = await bannerRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    
    Object.assign(banner, req.body);
    await bannerRepository.save(banner);
    res.json({ success: true, data: banner });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const bannerRepository = AppDataSource.getRepository(Banner);
    await bannerRepository.delete(req.params.id);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

export default router;
