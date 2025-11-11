import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Здесь будет логика бронирования столика
    const booking = {
      userId: req.userId,
      ...req.body,
      status: 'pending',
      createdAt: new Date(),
    };
    
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

export default router;
