/** Ongeldige of onvolledige request-body/-query; vertaalt naar HTTP 400 in de error-handler. */
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * De gebruiker heeft (nog) geen expliciete `health_data_consent` gegeven. Gezondheidsgegevens
 * (onboardingprofiel, doelen, maaltijdlogs — zie database-plan.md §7) mogen pas verwerkt worden
 * ná deze toestemming, niet als bijwerking van de verwerking zelf. Vertaalt naar HTTP 403.
 */
export class ConsentRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}
