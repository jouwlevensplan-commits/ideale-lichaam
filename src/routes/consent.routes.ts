import { Router } from 'express';

import { setAdConsent, setHealthConsent } from '../controllers/consent.controller';
import { requireAuth } from '../middleware/auth';

export const consentRouter = Router();

consentRouter.post('/health', requireAuth, setHealthConsent);
consentRouter.post('/ads', requireAuth, setAdConsent);
