import type { Request, Response } from 'express';

import { User } from '../db/models';
import { BadRequestError, ConflictError, UnauthorizedError } from '../db/errors';
import { hashPassword, signToken, verifyPassword } from '../services/auth.service';
import { DEMO_USER_ID } from '../db/seeds/demo-user.seed';
import { mapUser } from './mappers';

const AUTH_PROVIDER_EMAIL = 'email';
const DEFAULT_TIMEZONE = 'Europe/Brussels';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthRequestBody {
  email: string;
  password: string;
}

function validateBody(body: Partial<AuthRequestBody>): { email: string; password: string } {
  if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email.trim())) {
    throw new BadRequestError('Een geldig e-mailadres is verplicht.');
  }
  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`password is verplicht en moet minstens ${MIN_PASSWORD_LENGTH} tekens lang zijn.`);
  }

  return { email: body.email.trim().toLowerCase(), password: body.password };
}

/**
 * Maakt een nieuw e-mail/wachtwoord-account aan. Zet bewust geen GDPR-gezondheidsconsent: dat
 * blijft, zoals voorheen, een aparte, expliciete stap ná registratie (`POST /api/consent/health`,
 * vóór de onboarding — zie onboarding.controller.ts en CLAUDE.md §5.B). `auth_subject` is het
 * genormaliseerde e-mailadres; de bestaande unieke index op (`auth_provider`, `auth_subject`)
 * voorkomt dubbele registraties, ook bij een gelijktijdige race.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = validateBody((req.body ?? {}) as Partial<AuthRequestBody>);

  const existing = await User.findOne({ where: { auth_provider: AUTH_PROVIDER_EMAIL, auth_subject: email } });
  if (existing) {
    throw new ConflictError('Er bestaat al een account met dit e-mailadres.');
  }

  const password_hash = await hashPassword(password);

  let user: User;
  try {
    user = await User.create({
      auth_provider: AUTH_PROVIDER_EMAIL,
      auth_subject: email,
      password_hash,
      timezone: DEFAULT_TIMEZONE,
    });
  } catch {
    // Race: een gelijktijdige registratie voor hetzelfde e-mailadres won de unieke-index-check hierboven.
    throw new ConflictError('Er bestaat al een account met dit e-mailadres.');
  }

  const token = signToken(user.id);
  res.status(201).json({ user: mapUser(user), token });
}

/** Verifieert e-mail/wachtwoord en geeft een nieuwe JWT terug. Generieke foutmelding voor elke mismatch, om nooit te lekken of het e-mailadres bestaat. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = validateBody((req.body ?? {}) as Partial<AuthRequestBody>);

  const user = await User.findOne({ where: { auth_provider: AUTH_PROVIDER_EMAIL, auth_subject: email } });
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    throw new UnauthorizedError('Onjuist e-mailadres of wachtwoord.');
  }

  const token = signToken(user.id);
  res.status(200).json({ user: mapUser(user), token });
}

/**
 * Dev/test-only: geeft een echte JWT voor de vaste, publieke demo-gebruiker "Sam" (dezelfde
 * `DEMO_USER_ID` die al hardcoded in de frontend en de seed staat), zonder wachtwoord. Dit
 * endpoint blijft bewust ook in productie bereikbaar op de backend — de demo-identiteit is al
 * publieke, niet-gevoelige testdata (zie demo-user.seed.ts) en was vóór deze auth-uitbreiding
 * sowieso al voor iedereen te benaderen via een ongeverifieerde `X-User-Id`-header. De frontend
 * verbergt de bijbehorende knop in productiebuilds achter `__DEV__` (zie login.tsx); dit endpoint
 * geeft géén toegang tot enig ander, echt account.
 */
export async function demoLogin(_req: Request, res: Response): Promise<void> {
  const user = await User.findByPk(DEMO_USER_ID);
  if (!user) {
    throw new UnauthorizedError('De demo-gebruiker is nog niet geseed op de server.');
  }

  const token = signToken(user.id);
  res.status(200).json({ user: mapUser(user), token });
}
