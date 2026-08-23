import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

import { User } from '../db/models';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Gezet door `withUser`; de Postgres `users.id` voor deze request. */
      userId?: string;
    }
  }
}

const USER_ID_HEADER = 'x-user-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_TIMEZONE = 'Europe/Brussels';

/**
 * Er is nog geen echt authenticatiemechanisme (zie ook de LET OP-commentaren in
 * `frontend/src/services/api.service.ts`): de client stuurt voorlopig zelf een gebruikers-ID mee
 * via de `X-User-Id`-header. Deze middleware materialiseert daarvoor lazily een rij in de
 * Postgres `users`-tabel (find-or-create), zodat de onboarding-, consent- en maaltijdroutes
 * bruikbaar en end-to-end testbaar zijn zonder al op een volledig login-/registratiesysteem te
 * wachten. Vervang dit door echte sessie-/tokenverificatie zodra die er is.
 */
export async function withUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const headerValue = req.header(USER_ID_HEADER);
  const userId = headerValue && UUID_PATTERN.test(headerValue) ? headerValue : randomUUID();
  const timezone =
    typeof req.body?.timezone === 'string' && req.body.timezone.trim().length > 0
      ? req.body.timezone
      : DEFAULT_TIMEZONE;

  try {
    await User.findOrCreate({
      where: { id: userId },
      defaults: { id: userId, auth_provider: 'header', auth_subject: userId, timezone },
    });
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
}
