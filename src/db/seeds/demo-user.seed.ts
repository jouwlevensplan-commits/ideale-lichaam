import { User } from '../models';

/**
 * Vaste UUID voor de gemockte demo-gebruiker "Sam". Moet EXACT overeenkomen met `DEMO_USER_ID` in
 * `frontend/src/services/session.ts` — de twee bestanden leven in aparte TypeScript-projecten
 * zonder gedeeld package, dus deze waarde is bewust gedupliceerd in plaats van geïmporteerd (zie
 * ook `frontend/src/services/legal-copy.ts` voor hetzelfde patroon).
 */
export const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111';

/**
 * Zorgt dat de demo-gebruiker "Sam" altijd met actieve GDPR-toestemmingen in de database staat.
 * De frontend logt hierop in via `loginAsDemoUser()`, volledig buiten de server om — de eerste
 * echte serveraanroep (bv. een maaltijd loggen) gebruikt dus een `X-User-Id` die de backend nog
 * nooit gezien heeft. Zonder deze seed zou `withUser` daarvoor een rij aanmaken met
 * `health_data_consent: false` (het modelstandaard), en zou elke aanroep die consent vereist een
 * 403 teruggeven — precies het probleem dat deze seed voorkomt.
 *
 * Draait als upsert bij elke serverstart, dus dit herstelt Sam's status ook als iemand die tijdens
 * het testen handmatig heeft ingetrokken of aangepast.
 */
export async function seedDemoUser(): Promise<void> {
  const now = new Date();

  await User.upsert({
    id: DEMO_USER_ID,
    auth_provider: 'demo',
    auth_subject: 'sam-demo-user',
    status: 'active',
    timezone: 'Europe/Brussels',
    health_data_consent: true,
    health_data_opted_in_at: now,
    consent_policy_version: 'demo-v1',
    is_premium: true,
    analytics_consent: true,
    personalized_ads_consent: true,
    ad_consent_opted_in_at: now,
  });
}
