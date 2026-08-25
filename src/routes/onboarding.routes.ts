import { Router } from 'express';

import { completeOnboarding } from '../controllers/onboarding.controller';
import { requireAuth } from '../middleware/auth';

export const onboardingRouter = Router();

onboardingRouter.post('/complete', requireAuth, completeOnboarding);
