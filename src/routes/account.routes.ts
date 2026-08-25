import { Router } from 'express';

import { deleteAccount } from '../controllers/account.controller';
import { requireAuth } from '../middleware/auth';

export const accountRouter = Router();

accountRouter.delete('/', requireAuth, deleteAccount);
