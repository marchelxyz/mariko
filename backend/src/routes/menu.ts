import { Router, Request, Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { MenuItem } from '../models/MenuItem';
import { DishImage } from '../models/DishImage';

const router = Router();

router.get('/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    
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
        imageUrl: dishImage?.imageUrl || item.imageUrl, // Используем изображение из DishImage или старое imageUrl
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

    res.json({ success: true, data: groupedByCategory });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

export default router;
