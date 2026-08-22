import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_BANNER_TEMPLATE,
  HEALTH_DATA_CONSENT_TEMPLATE,
  SAAS_WITHDRAWAL_DISCLAIMER,
} from '../consent-templates';

/** Haalt alle stringwaarden uit een (geneste) sjabloonstructuur, zodat tests niet aan exacte veldnamen vastzitten. */
function extractStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(extractStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(extractStrings);
  return [];
}

function flattenText(template: unknown): string {
  return extractStrings(template).join('\n');
}

test('cookiebanner vermeldt "eindapparaat" en definieert de drie verplichte categorieën', () => {
  const text = flattenText(COOKIE_BANNER_TEMPLATE);
  assert.ok(text.includes('eindapparaat'), 'verwacht de wettelijke term "eindapparaat" in de introtekst');

  const keys = COOKIE_BANNER_TEMPLATE.categories.map((c) => c.key).sort();
  assert.deepEqual(keys, ['analytics', 'necessary', 'personalized_ads']);

  const labels = COOKIE_BANNER_TEMPLATE.categories.map((c) => c.label);
  assert.deepEqual(labels.sort(), ['Analytisch', 'Gepersonaliseerde Advertenties', 'Noodzakelijk'].sort());
});

test('cookiebanner: alleen "Noodzakelijk" is verplicht en vooraf aangevinkt, de rest is opt-in', () => {
  const necessary = COOKIE_BANNER_TEMPLATE.categories.find((c) => c.key === 'necessary')!;
  assert.equal(necessary.mandatory, true);
  assert.equal(necessary.defaultEnabled, true);

  for (const key of ['analytics', 'personalized_ads'] as const) {
    const category = COOKIE_BANNER_TEMPLATE.categories.find((c) => c.key === key)!;
    assert.equal(category.mandatory, false, `${key} mag niet verplicht zijn`);
    assert.equal(category.defaultEnabled, false, `${key} mag niet vooraf aangevinkt staan (geen pre-ticked box)`);
  }
});

test('cookiebanner schrijft gelijke visuele nadruk voor "Weiger Alles" en "Accepteer Alles" voor (anti-dark-pattern)', () => {
  assert.equal(COOKIE_BANNER_TEMPLATE.buttons.acceptAll, 'Accepteer Alles');
  assert.equal(COOKIE_BANNER_TEMPLATE.buttons.rejectAll, 'Weiger Alles');

  const guidance = COOKIE_BANNER_TEMPLATE.designGuidance.toLowerCase();
  assert.ok(guidance.includes('weiger alles'));
  assert.ok(guidance.includes('accepteer alles'));
  assert.match(
    guidance,
    /even.{0,20}(prominent|opvallend)/,
    'de designGuidance moet expliciet gelijke prominentie tussen beide knoppen voorschrijven'
  );
});

test('toestemmingsverklaring gezondheidsgegevens beschrijft calorieën en gewichtsdoelen, en staat nooit vooraf aangevinkt', () => {
  const text = flattenText(HEALTH_DATA_CONSENT_TEMPLATE).toLowerCase();
  assert.ok(text.includes('gewicht'));
  assert.ok(text.includes('calorie'));
  assert.equal(HEALTH_DATA_CONSENT_TEMPLATE.defaultChecked, false);
});

test('toestemmingsverklaring gezondheidsgegevens herinnert eraan dat intrekken via de instellingen even eenvoudig is', () => {
  const reminder = HEALTH_DATA_CONSENT_TEMPLATE.withdrawalReminder.toLowerCase();
  assert.ok(reminder.includes('intrekken'));
  assert.ok(reminder.includes('instellingen'));
  assert.match(reminder, /even\s+eenvoudig/, 'moet expliciet vermelden dat intrekken even eenvoudig is als geven');
});

test('SaaS-herroepingsdisclaimer verwijst naar artikel VI.53, 13° WER en het verlies van het herroepingsrecht', () => {
  const text = flattenText(SAAS_WITHDRAWAL_DISCLAIMER);
  assert.ok(text.includes('herroepingsrecht'));
  assert.ok(text.includes('VI.53'));
  assert.ok(text.includes('13°'));
  assert.ok(text.includes('14 dagen'));
  assert.equal(SAAS_WITHDRAWAL_DISCLAIMER.defaultChecked, false);
});

test('SaaS-herroepingsdisclaimer bevat de wettelijk verplichte ondernemingsidentificatie inclusief KBO-nummer', () => {
  const text = flattenText(SAAS_WITHDRAWAL_DISCLAIMER);
  assert.ok(text.includes('KBO-nummer'));
  assert.ok(text.includes('btw-nummer'));
  assert.ok(SAAS_WITHDRAWAL_DISCLAIMER.confirmationEmailBody.length > 0, 'bevestiging op duurzame drager vereist');
});

test('de drie sjablonen bevatten samen alle wettelijk kernbegrippen: KBO-nummer, intrekken, herroepingsrecht, eindapparaat', () => {
  const fullText = [COOKIE_BANNER_TEMPLATE, HEALTH_DATA_CONSENT_TEMPLATE, SAAS_WITHDRAWAL_DISCLAIMER]
    .map(flattenText)
    .join('\n');

  for (const term of ['KBO-nummer', 'intrekken', 'herroepingsrecht', 'eindapparaat']) {
    assert.ok(fullText.includes(term), `verwacht kernbegrip "${term}" ontbreekt in de compliance-teksten`);
  }
});
