import { Router } from 'express';

import { getStreak, getToday } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.get('/today', requireAuth, getToday);
dashboardRouter.get('/streak', requireAuth, getStreak);
