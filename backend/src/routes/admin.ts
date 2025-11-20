import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { Banner } from '../models/Banner';
import { User, UserRole } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { Restaurant } from '../models/Restaurant';
import { createGoogleSheetsService } from '../services/GoogleSheetsService';
import { syncAllRestaurantsMenu } from '../services/syncService';
import { getMetrics, resetMetrics } from '../middleware/performanceMonitor';
import { 
  invalidateRestaurantsCache, 
  invalidateRestaurantCache,
  invalidateMenuCache,
  invalidateAllMenuCache 
} from '../services/cacheService';

const router = Router();

// Все админ роуты требуют аутентификации
router.use(authenticate);

// Управление баннерами (только для администраторов)
router.get('/banners', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, type } = req.query;
    const bannerRepository = AppDataSource.getRepository(Banner);
    
    const where: any = {};
    // Если restaurantId не указан, получаем баннеры для всех ресторанов (restaurantId = null)
    if (restaurantId) {
      where.restaurantId = restaurantId;
    } else {
      // Для "всех ресторанов" - баннеры без привязки к ресторану
      where.restaurantId = null;
    }
    if (type) where.type = type;
    
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
    const { 
      name, 
      city, 
      address, 
      phoneNumber, 
      googleSheetId,
      deliveryAggregators,
      yandexMapsUrl,
      twoGisUrl,
      socialNetworks
    } = req.body;
    
    if (!name || !city || !address || !phoneNumber) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }
    
    // Валидация доставки (до 5 агрегаторов)
    if (deliveryAggregators && (!Array.isArray(deliveryAggregators) || deliveryAggregators.length > 5)) {
      res.status(400).json({ success: false, message: 'Доставка может содержать максимум 5 агрегаторов' });
      return;
    }
    
    // Валидация социальных сетей (до 4)
    if (socialNetworks && (!Array.isArray(socialNetworks) || socialNetworks.length > 4)) {
      res.status(400).json({ success: false, message: 'Социальных сетей может быть максимум 4' });
      return;
    }
    
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    
    // Определяем ID таблицы Google Sheets
    const sheetId = googleSheetId || process.env.GOOGLE_SHEETS_ID;
    if (!sheetId) {
      res.status(400).json({ 
        success: false, 
        message: 'GOOGLE_SHEETS_ID должен быть указан в запросе или переменных окружения' 
      });
      return;
    }

    // Создаем ресторан
    const restaurant = restaurantRepository.create({
      name,
      city,
      address,
      phoneNumber,
      isActive: true,
      googleSheetId: sheetId,
      googleSheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      deliveryAggregators: deliveryAggregators || null,
      yandexMapsUrl: yandexMapsUrl || null,
      twoGisUrl: twoGisUrl || null,
      socialNetworks: socialNetworks || null,
    });
    
    const savedRestaurant = await restaurantRepository.save(restaurant);

    // Создаем лист в Google Sheets для нового ресторана
    try {
      const sheetsService = createGoogleSheetsService();
      const sheetName = await sheetsService.createSheetForRestaurant(name, savedRestaurant.id);
      
      savedRestaurant.googleSheetName = sheetName;
      await restaurantRepository.save(savedRestaurant);
    } catch (sheetsError) {
      console.error('Error creating Google Sheet for restaurant:', sheetsError);
      // Не прерываем создание ресторана, если не удалось создать лист
      // Администратор может создать лист вручную позже
    }
    
    // Инвалидируем кэш ресторанов
    await invalidateRestaurantsCache();
    
    res.json({ success: true, data: savedRestaurant });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to create restaurant' });
  }
});

router.put('/restaurants/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, 
      city, 
      address, 
      phoneNumber, 
      isActive,
      deliveryAggregators,
      yandexMapsUrl,
      twoGisUrl,
      socialNetworks
    } = req.body;
    
    // Валидация доставки (до 5 агрегаторов)
    if (deliveryAggregators !== undefined) {
      if (!Array.isArray(deliveryAggregators) || deliveryAggregators.length > 5) {
        res.status(400).json({ success: false, message: 'Доставка может содержать максимум 5 агрегаторов' });
        return;
      }
    }
    
    // Валидация социальных сетей (до 4)
    if (socialNetworks !== undefined) {
      if (!Array.isArray(socialNetworks) || socialNetworks.length > 4) {
        res.status(400).json({ success: false, message: 'Социальных сетей может быть максимум 4' });
        return;
      }
    }
    
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
    if (deliveryAggregators !== undefined) restaurant.deliveryAggregators = deliveryAggregators.length > 0 ? deliveryAggregators : null;
    if (yandexMapsUrl !== undefined) restaurant.yandexMapsUrl = yandexMapsUrl || null;
    if (twoGisUrl !== undefined) restaurant.twoGisUrl = twoGisUrl || null;
    if (socialNetworks !== undefined) restaurant.socialNetworks = socialNetworks.length > 0 ? socialNetworks : null;
    
    const updatedRestaurant = await restaurantRepository.save(restaurant);
    
    // Инвалидируем кэш ресторанов
    await invalidateRestaurantCache(req.params.id);
    
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
    
    // Инвалидируем кэш ресторанов
    await invalidateRestaurantCache(req.params.id);
    
    res.json({ success: true, message: 'Restaurant deactivated' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ success: false, message: 'Failed to delete restaurant' });
  }
});

// Синхронизация меню из Google Sheets для конкретного ресторана
router.post('/restaurants/:id/sync', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const restaurant = await restaurantRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    if (!restaurant.googleSheetName) {
      res.status(400).json({ 
        success: false, 
        message: 'У ресторана не настроен лист Google Sheets' 
      });
      return;
    }

    const sheetsService = createGoogleSheetsService();
    const result = await sheetsService.syncMenuFromSheet(restaurant);
    
    // Инвалидируем кэш меню для этого ресторана
    await invalidateMenuCache(req.params.id);
    
    res.json({ 
      success: true, 
      message: 'Синхронизация завершена',
      data: result 
    });
  } catch (error) {
    console.error('Error syncing restaurant menu:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to sync menu' 
    });
  }
});

// Синхронизация меню всех ресторанов
router.post('/restaurants/sync-all', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await syncAllRestaurantsMenu();
    
    // Инвалидируем весь кэш меню
    await invalidateAllMenuCache();
    
    res.json({ 
      success: true, 
      message: 'Синхронизация всех ресторанов завершена'
    });
  } catch (error) {
    console.error('Error syncing all restaurants:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to sync all restaurants' 
    });
  }
});

// ✅ Эндпоинт для просмотра метрик производительности (только для админов)
router.get('/metrics', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const metrics = getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
    });
  }
});

// ✅ Эндпоинт для сброса метрик (только для админов)
router.post('/metrics/reset', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    resetMetrics();
    res.json({
      success: true,
      message: 'Metrics reset',
    });
  } catch (error) {
    console.error('Error resetting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset metrics',
    });
  }
});

export default router;
