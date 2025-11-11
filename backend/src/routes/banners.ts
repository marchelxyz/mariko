import { Router, Request, Response } from 'express';
import { Banner } from '../models/Banner';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.query;
    const query: any = { isActive: true };
    
    if (restaurantId) {
      query.restaurantId = restaurantId;
    } else {
      query.restaurantId = { $exists: false };
    }

    const banners = await Banner.find(query).sort({ order: 1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch banners' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update banner' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

export default router;
