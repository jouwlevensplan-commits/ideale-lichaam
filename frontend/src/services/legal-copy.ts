/**
 * Frontend-kopie van de teksten uit de backend-compliance-module
 * (`maaltijd tracker/src/compliance/consent-templates.ts`). De frontend en backend zijn twee
 * aparte TypeScript-projecten (Node/Express vs. Expo/Metro) zonder gedeeld package, dus deze tekst
 * is hier bewust gedupliceerd in plaats van rechtstreeks geïmporteerd.
 *
 * LET OP: bij elke wijziging van de teksten in consent-templates.ts moet dit bestand handmatig
 * meegewerkt worden, anders lopen backend en app uit elkaar. Overweeg op termijn een gedeeld
 * package (npm workspace) of een backend-endpoint dat deze teksten uitserveert.
 */

export const COOKIE_BANNER_COPY = {
  title: 'Uw cookievoorkeuren',
  introText:
    'Wij vragen uw toestemming voordat wij cookies plaatsen of informatie raadplegen of opslaan op uw ' +
    'eindapparaat. Onder "Noodzakelijk" vindt u cookies die vereist zijn om de app te laten werken; deze ' +
    'kunt u niet uitschakelen. Voor "Analytisch" en "Gepersonaliseerde Advertenties" vragen wij per ' +
    'categorie apart uw toestemming. U kunt uw keuze op elk moment wijzigen, even eenvoudig als u ze gaf.',
  categories: [
    {
      key: 'necessary' as const,
      label: 'Noodzakelijk',
      description:
        'Strikt noodzakelijk voor de werking en beveiliging van de app. Vereist geen toestemming en kan ' +
        'niet worden uitgeschakeld.',
      mandatory: true,
      defaultEnabled: true,
    },
    {
      key: 'analytics' as const,
      label: 'Analytisch',
      description: 'Meet geanonimiseerd gebruik van de app zodat wij deze kunnen verbeteren.',
      mandatory: false,
      defaultEnabled: false,
    },
    {
      key: 'personalized_ads' as const,
      label: 'Gepersonaliseerde Advertenties',
      description:
        'Toont advertenties afgestemd op uw interesses. Staat volledig los van de andere categorieën.',
      mandatory: false,
      defaultEnabled: false,
    },
  ],
  buttons: {
    acceptAll: 'Accepteer Alles',
    rejectAll: 'Weiger Alles',
    savePreferences: 'Voorkeuren opslaan',
  },
};

export const HEALTH_DATA_CONSENT_COPY = {
  title: 'Toestemming voor gezondheidsgegevens',
  bodyText:
    'Om u een gepersonaliseerd voedings- en gewichtsplan te kunnen aanbieden, verwerken wij gegevens die ' +
    'onder de AVG/GDPR gelden als bijzondere categorieën van persoonsgegevens ("gezondheidsgegevens"). Wij ' +
    'verwerken deze uitsluitend op basis van uw uitdrukkelijke, actieve toestemming, en gebruiken ze enkel ' +
    'om uw persoonlijke caloriedoel, macronutriënten en voedingsadvies te berekenen en te tonen.',
  dataCategories: [
    'Lichaamsgewicht en streefgewicht',
    'Calorie- en macronutriënteninname',
    'Voedingspatroon, allergieën en intoleranties',
    'Activiteitsniveau',
  ],
  checkboxLabel:
    'Ik geef hierbij uitdrukkelijk, vrijwillig en actief mijn toestemming voor de verwerking van mijn ' +
    'hierboven beschreven gezondheidsgegevens voor dit doel.',
  withdrawalReminder:
    'U kunt deze toestemming steeds intrekken. Intrekken is even eenvoudig als ze geven: ga naar ' +
    'Instellingen > Privacy > Toestemmingen en zet de schakelaar "Gezondheidsgegevens" uit.',
};

/** Exacte tekst uit SAAS_WITHDRAWAL_DISCLAIMER (backend) — conform artikel VI.53, 13° WER. */
export const SAAS_WITHDRAWAL_COPY = {
  title: 'Bevestiging start betaald abonnement na de proefperiode',
  traderIdentification:
    '[Maatschappelijke naam van de onderneming], met maatschappelijke zetel te [geografisch adres, België], ' +
    'ingeschreven in de Kruispuntbank van Ondernemingen onder KBO-nummer [BE0XXX.XXX.XXX] en met ' +
    'btw-nummer [BEXXXXXXXXXX].',
  checkboxLabel:
    'Ik begrijp dat mijn gratis proefperiode van 5 dagen afloopt en dat mijn premium-abonnement daarna ' +
    'automatisch van start gaat, tenzij ik tijdig opzeg. Ik vraag hierbij uitdrukkelijk en vooraf dat de ' +
    'levering van deze digitale dienst onmiddellijk begint bij de start van het betaalde abonnement, nog vóór ' +
    'het verstrijken van de wettelijke herroepingstermijn van 14 dagen. Ik erken uitdrukkelijk dat ik daardoor, ' +
    'overeenkomstig artikel VI.53, 13° van het Wetboek van Economisch Recht (WER), mijn herroepingsrecht ' +
    'verlies zodra de uitvoering van de dienst is begonnen.',
};
