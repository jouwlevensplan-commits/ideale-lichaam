import { Router } from 'express';

import { logMeal } from '../controllers/meals.controller';
import { requireAuth } from '../middleware/auth';

export const mealsRouter = Router();

mealsRouter.post('/log', requireAuth, logMeal);
