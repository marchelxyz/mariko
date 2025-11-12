import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { DishImage } from '../models/DishImage';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

// Получить все изображения блюд
router.get('/', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    const images = await dishImageRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Error fetching dish images:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dish images' });
  }
});

// Загрузить изображение по ссылке
router.post('/', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { imageUrl, name } = req.body;
    
    if (!imageUrl) {
      res.status(400).json({ success: false, message: 'imageUrl обязателен' });
      return;
    }

    // Валидация URL
    try {
      new URL(imageUrl);
    } catch {
      res.status(400).json({ success: false, message: 'Некорректный URL изображения' });
      return;
    }

    const dishImageRepository = AppDataSource.getRepository(DishImage);
    
    // Проверяем, не существует ли уже изображение с таким URL
    const existingImage = await dishImageRepository.findOne({
      where: { imageUrl },
    });

    if (existingImage) {
      res.json({ success: true, data: existingImage, message: 'Изображение уже существует' });
      return;
    }

    // Создаем новое изображение (ID будет присвоен автоматически)
    const dishImage = dishImageRepository.create({
      imageUrl,
      name: name || null,
    });

    const savedImage = await dishImageRepository.save(dishImage);
    
    res.json({ success: true, data: savedImage });
  } catch (error) {
    console.error('Error uploading dish image:', error);
    res.status(500).json({ success: false, message: 'Failed to upload dish image' });
  }
});

// Загрузить несколько изображений по ссылкам
router.post('/bulk', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { images } = req.body; // Массив объектов { imageUrl, name? }
    
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ success: false, message: 'images должен быть непустым массивом' });
      return;
    }

    const dishImageRepository = AppDataSource.getRepository(DishImage);
    const results = [];

    for (const imageData of images) {
      const { imageUrl, name } = imageData;
      
      if (!imageUrl) {
        continue;
      }

      // Валидация URL
      try {
        new URL(imageUrl);
      } catch {
        continue;
      }

      // Проверяем, не существует ли уже изображение с таким URL
      const existingImage = await dishImageRepository.findOne({
        where: { imageUrl },
      });

      if (existingImage) {
        results.push(existingImage);
        continue;
      }

      // Создаем новое изображение
      const dishImage = dishImageRepository.create({
        imageUrl,
        name: name || null,
      });

      const savedImage = await dishImageRepository.save(dishImage);
      results.push(savedImage);
    }

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('Error bulk uploading dish images:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk upload dish images' });
  }
});

// Получить изображение по ID
router.get('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    const image = await dishImageRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }
    
    res.json({ success: true, data: image });
  } catch (error) {
    console.error('Error fetching dish image:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dish image' });
  }
});

// Удалить изображение
router.delete('/:id', requireRole('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const dishImageRepository = AppDataSource.getRepository(DishImage);
    const image = await dishImageRepository.findOne({
      where: { id: req.params.id },
    });
    
    if (!image) {
      res.status(404).json({ success: false, message: 'Image not found' });
      return;
    }

    await dishImageRepository.remove(image);
    
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('Error deleting dish image:', error);
    res.status(500).json({ success: false, message: 'Failed to delete dish image' });
  }
});

export default router;
