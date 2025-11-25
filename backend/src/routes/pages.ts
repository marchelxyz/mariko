import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { Banner } from '../models/Banner';
import { MenuItem } from '../models/MenuItem';
import { DishImage } from '../models/DishImage';
import { In } from 'typeorm';
import {
  getHomePageFromCache,
  setHomePageToCache,
  getMenuPageFromCache,
  setMenuPageToCache,
} from '../services/cacheService';

const router = Router();

/**
 * GET /api/pages/home
 * Получить полные данные для главной страницы
 * Поддерживает кэширование через Redis
 */
router.get('/home', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;
    const restaurantIdStr = restaurantId as string | undefined;

    // Пытаемся получить из кэша
    const cached = await getHomePageFromCache(restaurantIdStr);
    if (cached) {
      console.log('✅ Данные главной страницы получены из кэша');
      return res.json({ success: true, data: cached, cached: true });
    }

    const bannerRepository = AppDataSource.getRepository(Banner);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);

    // Загружаем горизонтальные баннеры
    const queryBuilder = bannerRepository.createQueryBuilder('banner');
    queryBuilder.where('banner.isActive = :isActive', { isActive: true });

    if (restaurantIdStr) {
      queryBuilder.andWhere(
        '(banner.restaurantId = :restaurantId OR banner.restaurantId IS NULL)',
        { restaurantId: restaurantIdStr }
      );
    } else {
      queryBuilder.andWhere('banner.restaurantId IS NULL');
    }

    queryBuilder.andWhere('banner.type = :type', { type: 'horizontal' });
    queryBuilder.orderBy('banner.order', 'ASC');

    const banners = await queryBuilder.getMany();

    // Загружаем активные рестораны
    const restaurants = await restaurantRepository.find({
      where: { isActive: true },
      order: { city: 'ASC', name: 'ASC' },
    });

    const pageData = {
      banners,
      restaurants,
      restaurantId: restaurantIdStr || null,
    };

    // Сохраняем в кэш
    await setHomePageToCache(restaurantIdStr, pageData);

    res.json({ success: true, data: pageData, cached: false });
  } catch (error) {
    console.error('Error fetching home page data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch home page data' });
  }
});

/**
 * GET /api/pages/menu/:restaurantId
 * Получить полные данные для страницы меню
 * Поддерживает кэширование через Redis
 */
router.get('/menu/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;

    // Пытаемся получить из кэша
    const cached = await getMenuPageFromCache(restaurantId);
    if (cached) {
      console.log(`✅ Данные страницы меню для ресторана ${restaurantId} получены из кэша`);
      return res.json({ success: true, data: cached, cached: true });
    }

    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);

    // Загружаем ресторан
    const restaurant = await restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }

    // Загружаем меню
    const menuItems = await menuItemRepository.find({
      where: { restaurantId, isAvailable: true },
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
        price: item.price,
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

    const pageData = {
      restaurant,
      menuItems: groupedByCategory,
    };

    // Сохраняем в кэш
    await setMenuPageToCache(restaurantId, pageData);

    res.json({ success: true, data: pageData, cached: false });
  } catch (error) {
    console.error('Error fetching menu page data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu page data' });
  }
});

export default router;
