import { Router } from 'express';

import { logMeal } from '../controllers/meals.controller';
import { withUser } from '../middleware/user-context';

export const mealsRouter = Router();

mealsRouter.post('/log', withUser, logMeal);
