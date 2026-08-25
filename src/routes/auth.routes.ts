import { Router } from 'express';

import { demoLogin, login, register } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/demo-login', demoLogin);
