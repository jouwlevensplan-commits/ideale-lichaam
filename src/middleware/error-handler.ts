import type { NextFunction, Request, Response } from 'express';

import { BadRequestError, ConsentRequiredError } from '../db/errors';
import { ProductNotFoundError } from '../services/product.service';

/**
 * Centrale foutafhandeling voor de API-routes. Express 5 stuurt afgewezen promises uit
 * async route-handlers automatisch hierheen, dus routes hoeven zelf geen try/catch te doen.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof BadRequestError) {
    res.status(400).json({ error: 'bad_request', message: error.message });
    return;
  }

  if (error instanceof ConsentRequiredError) {
    res.status(403).json({ error: 'health_data_consent_required', message: error.message });
    return;
  }

  if (error instanceof ProductNotFoundError) {
    res.status(404).json({ error: 'product_not_found', message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'internal_error', message: 'Er ging iets mis. Probeer het later opnieuw.' });
}
