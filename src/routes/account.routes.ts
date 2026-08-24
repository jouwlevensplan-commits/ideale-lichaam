import { Router } from 'express';

import { deleteAccount } from '../controllers/account.controller';
import { withUser } from '../middleware/user-context';

export const accountRouter = Router();

accountRouter.delete('/', withUser, deleteAccount);
