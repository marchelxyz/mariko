import { Router, Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem';

const router = Router();

router.get('/:restaurantId', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await MenuItem.find({ restaurantId, isAvailable: true })
      .sort({ category: 1, name: 1 });
    
    const groupedByCategory = menuItems.reduce((acc: any, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({ success: true, data: groupedByCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch menu' });
  }
});

export default router;
