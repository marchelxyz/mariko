import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { GeneralMenuItem } from '../models/GeneralMenuItem';
import { DishImage } from '../models/DishImage';
import { In } from 'typeorm';
import { getGeneralMenuFromCache, setGeneralMenuToCache } from '../services/cacheService';

const router = Router();

/**
 * GET /api/general-menu
 * Получить общее меню (без привязки к ресторанам, без цен)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Пытаемся получить из кэша
    const cached = await getGeneralMenuFromCache();
    if (cached) {
      console.log('✅ Общее меню получено из кэша');
      return res.json({ success: true, data: cached, cached: true });
    }

    const generalMenuItemRepository = AppDataSource.getRepository(GeneralMenuItem);
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    
    const menuItems = await generalMenuItemRepository.find({
      where: { isAvailable: true },
      order: { category: 'ASC', name: 'ASC' },
    });
    
    // Получаем все изображения для меню
    const dishImageIds = menuItems
      .map(item => item.dishImageId)
      .filter((id): id is string => !!id);
    
    const dishImages = dishImageIds.length > 0
      ? await dishImageRepository.find({
          where: { id: In(dishImageIds) },
        })
      : [];
    
    const dishImageMap = new Map(dishImages.map(img => [img.id, img]));
    
    // Формируем ответ с данными о блюдах и их изображениях
    const menuItemsWithImages = menuItems.map(item => {
      const dishImage = item.dishImageId ? dishImageMap.get(item.dishImageId) : null;
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        // Нет поля price - общее меню без цен
        category: item.category,
        calories: item.calories,
        ingredients: item.ingredients,
        imageUrl: dishImage?.imageUrl || item.imageUrl,
        dishImageId: item.dishImageId,
        internalDishId: item.internalDishId,
        isAvailable: item.isAvailable,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
    
    const groupedByCategory = menuItemsWithImages.reduce((acc: any, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    // Сохраняем в кэш
    await setGeneralMenuToCache(groupedByCategory);

    res.json({ success: true, data: groupedByCategory, cached: false });
  } catch (error) {
    console.error('Error fetching general menu:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch general menu' });
  }
});

export default router;
