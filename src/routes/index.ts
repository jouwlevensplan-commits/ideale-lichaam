import { Router } from 'express';

import { accountRouter } from './account.routes';
import { authRouter } from './auth.routes';
import { consentRouter } from './consent.routes';
import { mealsRouter } from './meals.routes';
import { onboardingRouter } from './onboarding.routes';
import { productsRouter } from './products.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/onboarding', onboardingRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/meals', mealsRouter);
apiRouter.use('/consent', consentRouter);
apiRouter.use('/account', accountRouter);
