import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Banner } from '../models/Banner';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { 
  getBannersFromCache, 
  setBannersToCache, 
  invalidateBannersCache,
  invalidateHomePageCache 
} from '../services/cacheService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId, type } = req.query;
    
    // Пытаемся получить из кэша
    const cached = await getBannersFromCache(
      restaurantId as string | undefined,
      type as string | undefined
    );
    if (cached) {
      console.log('✅ Баннеры получены из кэша');
      return res.json({ success: true, data: cached, cached: true });
    }

    const bannerRepository = AppDataSource.getRepository(Banner);
    
    // Используем QueryBuilder для гибких условий
    const queryBuilder = bannerRepository.createQueryBuilder('banner');
    
    // Всегда фильтруем по активным баннерам
    queryBuilder.where('banner.isActive = :isActive', { isActive: true });
    
    // Если restaurantId передан, возвращаем баннеры для этого ресторана И для всех ресторанов (restaurantId = null)
    // Если restaurantId не передан, возвращаем только баннеры для всех ресторанов
    if (restaurantId) {
      queryBuilder.andWhere(
        '(banner.restaurantId = :restaurantId OR banner.restaurantId IS NULL)',
        { restaurantId }
      );
    } else {
      queryBuilder.andWhere('banner.restaurantId IS NULL');
    }
    
    // Фильтрация по типу баннера (horizontal или vertical)
    if (type) {
      queryBuilder.andWhere('banner.type = :type', { type });
    }
    
    // Сортировка по порядку
    queryBuilder.orderBy('banner.order', 'ASC');

    const banners = await queryBuilder.getMany();
    
    // Сохраняем в кэш
    await setBannersToCache(
      restaurantId as string | undefined,
      type as string | undefined,
      banners
    );
    
    res.json({ success: true, data: banners, cached: false });
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
    
    // Инвалидируем кэш баннеров и главной страницы
    await invalidateBannersCache();
    await invalidateHomePageCache();
    
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
    
    // Инвалидируем кэш баннеров и главной страницы
    await invalidateBannersCache();
    await invalidateHomePageCache();
    
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
    
    // Инвалидируем кэш баннеров и главной страницы
    await invalidateBannersCache();
    await invalidateHomePageCache();
    
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

export default router;
