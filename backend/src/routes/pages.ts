import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Restaurant } from '../models/Restaurant';
import { Banner } from '../models/Banner';
import { MenuItem } from '../models/MenuItem';
import { DishImage } from '../models/DishImage';
import { User } from '../models/User';
import { In } from 'typeorm';
import jwt from 'jsonwebtoken';
import {
  getHomePageFromCache,
  setHomePageToCache,
  getMenuPageFromCache,
  setMenuPageToCache,
} from '../services/cacheService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Опциональный middleware для аутентификации
 * Если токен есть и валиден, устанавливает userId, иначе просто продолжает
 */
const optionalAuthenticate = async (
  req: Request | AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; role: string };
    const authReq = req as AuthRequest;
    authReq.userId = decoded.userId;
    next();
  } catch (error) {
    // Если токен невалиден, просто продолжаем без авторизации
    next();
  }
};

/**
 * GET /api/pages/home
 * Получить полные данные для главной страницы
 * Поддерживает кэширование через Redis
 * Теперь также возвращает меню и любимый ресторан пользователя
 */
router.get('/home', optionalAuthenticate, async (req: Request | AuthRequest, res: Response) => {
  const requestStartTime = Date.now();
  console.log(`[pages/home] 📥 Начало обработки запроса /home`);
  console.log(`   Query params:`, req.query);
  console.log(`   User ID:`, (req as AuthRequest).userId || 'не авторизован');
  
  try {
    // Проверяем подключение к БД перед началом обработки
    if (!AppDataSource.isInitialized) {
      console.error('[pages/home] ❌ База данных не инициализирована');
      return res.status(503).json({ 
        success: false, 
        message: 'Database not initialized',
        code: 'DATABASE_NOT_INITIALIZED'
      });
    }

    const { restaurantId } = req.query;
    const restaurantIdStr = restaurantId as string | undefined;
    const authReq = req as AuthRequest;
    const userId = authReq.userId;

    console.log(`[pages/home] 🔄 Попытка получить данные из кэша...`);
    // Пытаемся получить из кэша (но только если нет авторизации, т.к. любимый ресторан может отличаться)
    const cacheKey = userId ? `${restaurantIdStr || 'default'}_${userId}` : restaurantIdStr;
    if (!userId) {
      try {
        const cached = await getHomePageFromCache(restaurantIdStr);
        if (cached) {
          const cacheTime = Date.now() - requestStartTime;
          console.log(`[pages/home] ✅ Данные главной страницы получены из кэша за ${cacheTime}ms`);
          return res.json({ success: true, data: cached, cached: true });
        }
      } catch (cacheError) {
        console.warn('[pages/home] ⚠️ Ошибка при получении из кэша (продолжаем):', cacheError);
        // Продолжаем выполнение, если кэш недоступен
      }
    }

    console.log(`[pages/home] 🔄 Загрузка данных из БД...`);
    const bannerRepository = AppDataSource.getRepository(Banner);
    const restaurantRepository = AppDataSource.getRepository(Restaurant);
    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    const dishImageRepository = AppDataSource.getRepository(DishImage);

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

    // Определяем ресторан для загрузки меню
    let targetRestaurantId = restaurantIdStr;
    let favoriteRestaurant = null;
    let selectedRestaurantId = null; // Явно выбранный ресторан (для возврата клиенту)

    // Если пользователь авторизован, загружаем его любимый ресторан
    if (userId) {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (user?.favoriteRestaurantId) {
        const favorite = await restaurantRepository.findOne({
          where: { id: user.favoriteRestaurantId },
        });
        if (favorite && favorite.isActive) {
          favoriteRestaurant = favorite;
          // Если не указан restaurantId, используем любимый ресторан
          if (!targetRestaurantId) {
            targetRestaurantId = favorite.id;
            selectedRestaurantId = favorite.id; // Избранный ресторан считается явным выбором
          }
        }
      }
    }

    // Если restaurantId указан в query параметрах, это явный выбор пользователя
    if (restaurantIdStr) {
      selectedRestaurantId = restaurantIdStr;
    }

    // Загружаем меню для выбранного ресторана или первого ресторана по умолчанию
    let menuItems = null;
    
    // Если ресторан не указан, используем первый ресторан из списка
    if (!targetRestaurantId && restaurants.length > 0) {
      targetRestaurantId = restaurants[0].id;
    }
    
    if (targetRestaurantId) {
      // Загружаем меню конкретного ресторана с использованием индексов
      const menuItemsData = await menuItemRepository.find({
        where: { restaurantId: targetRestaurantId, isAvailable: true },
        order: { category: 'ASC', name: 'ASC' },
        // Используем индексы: [restaurantId, isAvailable] и [category]
      });

      // Оптимизированная загрузка изображений: один батч-запрос для всех изображений
      const dishImageIds = menuItemsData
        .map(item => item.dishImageId)
        .filter((id): id is string => !!id);

      const dishImageMap = new Map<string, DishImage>();
      if (dishImageIds.length > 0) {
        // Используем In() для батч-загрузки всех изображений за один запрос
        const dishImages = await dishImageRepository.find({
          where: { id: In(dishImageIds) },
        });
        dishImages.forEach(img => dishImageMap.set(img.id, img));
      }

      // Формируем ответ с данными о блюдах и их изображениях
      menuItems = menuItemsData.map(item => {
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
    }

    const pageData = {
      banners,
      restaurants,
      restaurantId: restaurantIdStr || null,
      menuItems: menuItems || [],
      favoriteRestaurant,
      selectedRestaurantId, // Теперь null, если нет явного выбора или избранного ресторана
    };

    const dbLoadTime = Date.now() - requestStartTime;
    console.log(`[pages/home] ✅ Данные загружены из БД за ${dbLoadTime}ms:`, {
      bannersCount: banners.length,
      restaurantsCount: restaurants.length,
      menuItemsCount: menuItems?.length || 0,
      hasFavoriteRestaurant: !!favoriteRestaurant,
    });

    // Сохраняем в кэш только для неавторизованных пользователей
    if (!userId) {
      try {
        await setHomePageToCache(restaurantIdStr, pageData);
        console.log(`[pages/home] ✅ Данные сохранены в кэш`);
      } catch (cacheError) {
        console.warn('[pages/home] ⚠️ Ошибка при сохранении в кэш (не критично):', cacheError);
        // Продолжаем выполнение, если кэш недоступен
      }
    }

    const totalTime = Date.now() - requestStartTime;
    console.log(`[pages/home] ✅ Запрос успешно обработан за ${totalTime}ms`);
    res.json({ success: true, data: pageData, cached: false });
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`[pages/home] ❌ Ошибка при обработке запроса (время до ошибки: ${totalTime}ms):`, error);
    
    // Детальное логирование ошибки
    if (error instanceof Error) {
      console.error(`[pages/home] Тип ошибки: ${error.constructor.name}`);
      console.error(`[pages/home] Сообщение: ${error.message}`);
      if (error.stack) {
        console.error(`[pages/home] Stack trace:`, error.stack);
      }
    }

    // Проверяем тип ошибки для более информативного ответа
    let statusCode = 500;
    let errorMessage = 'Failed to fetch home page data';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        statusCode = 504;
        errorMessage = 'Request timeout - database query took too long';
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        statusCode = 503;
        errorMessage = 'Database connection failed';
        errorCode = 'DATABASE_CONNECTION_ERROR';
      } else if (error.message.includes('not initialized')) {
        statusCode = 503;
        errorMessage = 'Database not initialized';
        errorCode = 'DATABASE_NOT_INITIALIZED';
      }
    }

    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    });
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

    // Загружаем меню с использованием индексов для оптимизации
    const menuItems = await menuItemRepository.find({
      where: { restaurantId, isAvailable: true },
      order: { category: 'ASC', name: 'ASC' },
      // Используем индексы: [restaurantId, isAvailable] и [category]
    });

    // Оптимизированная загрузка изображений: один батч-запрос для всех изображений
    const dishImageIds = menuItems
      .map(item => item.dishImageId)
      .filter((id): id is string => !!id);

    const dishImageMap = new Map<string, DishImage>();
    if (dishImageIds.length > 0) {
      // Используем In() для батч-загрузки всех изображений за один запрос
      // Индекс на dishImageId ускорит этот запрос
      const dishImages = await dishImageRepository.find({
        where: { id: In(dishImageIds) },
      });
      dishImages.forEach(img => dishImageMap.set(img.id, img));
    }

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
