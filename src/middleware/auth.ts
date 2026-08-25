import type { NextFunction, Request, Response } from 'express';

import { User } from '../db/models';
import { UnauthorizedError } from '../db/errors';
import { verifyToken } from '../services/auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Gezet door `requireAuth`; de Postgres `users.id` uit een geverifieerde JWT voor deze request. */
      userId?: string;
      /** Gezet door `requireAuth`; het bijbehorende `User`-record, zodat controllers niet opnieuw hoeven te queryen. */
      user?: User;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Vervangt de vroegere `withUser` (find-or-create op een ongeverifieerde `X-User-Id`-header, zie
 * git-geschiedenis): verwacht een geldige `Authorization: Bearer <token>`-header, geverifieerd met
 * `auth.service.ts`. Zet bij succes zowel `req.userId` als `req.user`; anders `next(UnauthorizedError)`
 * zodat de centrale error-handler consistent een 401 teruggeeft.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new UnauthorizedError('Ontbrekende of ongeldige Authorization-header.'));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  try {
    const { sub: userId } = verifyToken(token);

    const user = await User.findByPk(userId);
    if (!user) {
      next(new UnauthorizedError('Deze token hoort bij een account dat niet meer bestaat.'));
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
