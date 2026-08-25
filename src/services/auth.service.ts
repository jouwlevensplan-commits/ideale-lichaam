import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { UnauthorizedError } from '../db/errors';

/**
 * Bcrypt-kostfactor voor wachtwoordhashing. 10 is de bcrypt-standaard en een breed geaccepteerd
 * minimum (OWASP); we kiezen bewust niet hoger op deze dienst, die op een 0,1 vCPU
 * Northflank-container draait — elke stap in de kostfactor verdubbelt de CPU-tijd per hash, en
 * login/registratie mag geen merkbare vertraging worden op zo'n beperkte CPU-toewijzing.
 */
const BCRYPT_COST_FACTOR = 10;
const TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  sub: string;
}

/** Leest `JWT_SECRET` pas op het moment dat een token echt getekend/geverifieerd wordt (niet bij het importeren van deze module), zodat een ontbrekende secret nooit de opstart blokkeert — enkel de aanroepende request faalt met een duidelijke fout. */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET ontbreekt. Zet deze omgevingsvariabele op de Northflank-service (en lokaal in je shell) voordat authenticatie kan werken.'
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

/** Verifieert en decodeert een JWT. Gooit `UnauthorizedError` bij een ontbrekende/foute/verlopen token, nooit de onderliggende jsonwebtoken-foutklasse. */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      throw new UnauthorizedError('Ongeldige token.');
    }
    return { sub: decoded.sub };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Ongeldige of verlopen token.');
  }
}
