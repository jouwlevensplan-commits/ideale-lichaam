import { Router } from 'express';

import { consentRouter } from './consent.routes';
import { mealsRouter } from './meals.routes';
import { onboardingRouter } from './onboarding.routes';
import { productsRouter } from './products.routes';

export const apiRouter = Router();

apiRouter.use('/onboarding', onboardingRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/meals', mealsRouter);
apiRouter.use('/consent', consentRouter);
