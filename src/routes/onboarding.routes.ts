import { Router } from 'express';

import { completeOnboarding } from '../controllers/onboarding.controller';
import { withUser } from '../middleware/user-context';

export const onboardingRouter = Router();

onboardingRouter.post('/complete', withUser, completeOnboarding);
