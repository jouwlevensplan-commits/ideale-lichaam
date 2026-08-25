import type { Request, Response } from 'express';

import { BadRequestError, UnauthorizedError } from '../db/errors';
import { mapUser } from './mappers';

const CONSENT_POLICY_VERSION = process.env.CONSENT_POLICY_VERSION ?? 'privacy-v1';

/**
 * Deze twee routes staan niet in de oorspronkelijke opdracht (die noemde alleen onboarding/
 * products/meals), maar zijn wel wat de frontend al aanroept (`apiService.setHealthDataConsent`/
 * `setAdConsent`, zie frontend/src/services/api.service.ts) én de enige manier om
 * `users.health_data_consent` vooraf op `true` te krijgen. Zonder deze routes zou de strikte
 * consent-poort in `onboarding.controller.ts` nooit gehaald kunnen worden.
 */

export async function setHealthConsent(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Ontbrekende gebruikerscontext.');
  }
  if (typeof req.body?.accepted !== 'boolean') {
    throw new BadRequestError('accepted (boolean) is verplicht.');
  }

  const accepted = req.body.accepted as boolean;
  user.health_data_consent = accepted;
  user.health_data_opted_in_at = accepted ? new Date() : null;
  user.consent_policy_version = CONSENT_POLICY_VERSION;
  await user.save();

  res.status(200).json(mapUser(user));
}

export async function setAdConsent(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    throw new UnauthorizedError('Ontbrekende gebruikerscontext.');
  }

  const { analyticsConsent, personalizedAdsConsent } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof analyticsConsent !== 'boolean' || typeof personalizedAdsConsent !== 'boolean') {
    throw new BadRequestError('analyticsConsent en personalizedAdsConsent (boolean) zijn verplicht.');
  }

  user.analytics_consent = analyticsConsent;
  user.personalized_ads_consent = personalizedAdsConsent;
  user.ad_consent_opted_in_at = new Date();
  await user.save();

  res.status(200).json(mapUser(user));
}
