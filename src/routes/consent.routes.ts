import { Router } from 'express';

import { setAdConsent, setHealthConsent } from '../controllers/consent.controller';
import { withUser } from '../middleware/user-context';

export const consentRouter = Router();

consentRouter.post('/health', withUser, setHealthConsent);
consentRouter.post('/ads', withUser, setAdConsent);
