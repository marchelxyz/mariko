import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { MenuItem } from '../models/MenuItem';

const router = Router();

router.get('/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const menuItemRepository = AppDataSource.getRepository(MenuItem);
    const menuItems = await menuItemRepository.find({
      where: { restaurantId, isAvailable: true },
      order: { category: 'ASC', name: 'ASC' },
    });
    
    const groupedByCategory = menuItems.reduce((acc: any, item) => {
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
