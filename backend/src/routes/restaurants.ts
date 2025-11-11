import { Router, Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true }).sort({ city: 1, name: 1 });
    res.json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch restaurants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      res.status(404).json({ success: false, message: 'Restaurant not found' });
      return;
    }
    res.json({ success: true, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch restaurant' });
  }
});

export default router;
