/**
 * Sjablonen voor de juridisch verplichte toestemmings- en informatieteksten van de Belgische markt
 * (ePrivacy/cookiewetgeving, AVG/GDPR bijzondere categorieën, en Boek VI WER consumentenrecht).
 *
 * Deze teksten zijn met zorg opgesteld op basis van de geldende regelgeving, maar vormen geen
 * juridisch advies. Laat ze vóór productiegebruik nalezen door een jurist, en vul de
 * ondernemingsgegevens (KBO-nummer, btw-nummer, adres) in voordat ze getoond worden.
 */

export type CookieCategoryKey = 'necessary' | 'analytics' | 'personalized_ads';

export interface CookieConsentCategory {
  key: CookieCategoryKey;
  label: string;
  description: string;
  /** Noodzakelijke cookies vereisen geen toestemming en kunnen niet uitgeschakeld worden. */
  mandatory: boolean;
  /** Niet-noodzakelijke categorieën mogen NOOIT vooraf aangevinkt staan (geen pre-ticked boxes). */
  defaultEnabled: boolean;
}

export interface CookieBannerTemplate {
  title: string;
  introText: string;
  categories: CookieConsentCategory[];
  buttons: {
    acceptAll: string;
    rejectAll: string;
    manageCustomize: string;
    savePreferences: string;
  };
  /** Normatieve implementatie-instructie voor ontwikkelaars/designers, geen gebruikerstekst. */
  designGuidance: string;
  policyLinkText: string;
  legalBasis: string;
}

export const COOKIE_BANNER_TEMPLATE: CookieBannerTemplate = {
  title: 'Uw cookievoorkeuren',
  introText:
    'Wij vragen uw toestemming voordat wij cookies plaatsen of informatie raadplegen of opslaan op uw ' +
    'eindapparaat (bijvoorbeeld uw smartphone, tablet of computer), overeenkomstig artikel 129 van de Wet ' +
    'Elektronische Communicatie (omzetting van de Europese ePrivacy-richtlijn) en de AVG/GDPR. Onder ' +
    '"Noodzakelijk" vindt u cookies die vereist zijn om de app te laten werken; deze kunt u niet uitschakelen. ' +
    'Voor "Analytisch" en "Gepersonaliseerde Advertenties" vragen wij per categorie apart uw vrije, specifieke, ' +
    'geïnformeerde en ondubbelzinnige toestemming. U kunt uw keuze op elk moment wijzigen via de ' +
    'cookie-instellingen, even eenvoudig als u ze gaf.',
  categories: [
    {
      key: 'necessary',
      label: 'Noodzakelijk',
      description:
        'Strikt noodzakelijk voor de werking en beveiliging van de app (bijvoorbeeld het onthouden van uw ' +
        'sessie). Deze cookies vereisen geen toestemming en kunnen niet worden uitgeschakeld.',
      mandatory: true,
      defaultEnabled: true,
    },
    {
      key: 'analytics',
      label: 'Analytisch',
      description:
        'Meet geanonimiseerd of gepseudonimiseerd gebruik van de app zodat wij deze kunnen verbeteren. ' +
        'Wordt alleen geplaatst als u hiervoor apart toestemming geeft.',
      mandatory: false,
      defaultEnabled: false,
    },
    {
      key: 'personalized_ads',
      label: 'Gepersonaliseerde Advertenties',
      description:
        'Wordt gebruikt om advertenties te tonen die zijn afgestemd op uw interesses. Staat volledig los van ' +
        'de andere toestemmingscategorieën en wordt alleen geplaatst na uw uitdrukkelijke, aparte toestemming.',
      mandatory: false,
      defaultEnabled: false,
    },
  ],
  buttons: {
    acceptAll: 'Accepteer Alles',
    rejectAll: 'Weiger Alles',
    manageCustomize: 'Voorkeuren beheren',
    savePreferences: 'Voorkeuren opslaan',
  },
  designGuidance:
    'VERPLICHT bij implementatie: de knop "Weiger Alles" moet in grootte, kleurcontrast, positie en visuele ' +
    'stijl exact even prominent en opvallend zijn als de knop "Accepteer Alles" — beide op hetzelfde, eerste ' +
    'scherm van de banner, zonder dat de gebruiker moet doorklikken naar een submenu om te weigeren. Gebruik ' +
    'geen groter lettertype, feller kleurcontrast, vooraf aangevinkte vakjes voor niet-noodzakelijke ' +
    'categorieën, of ontmoedigende taal die de gebruiker richting "Accepteer Alles" duwt. Dit is verplicht om ' +
    'dark patterns/misleidende ontwerpkeuzes te voorkomen, conform de richtsnoeren van de Belgische ' +
    'Gegevensbeschermingsautoriteit (GBA) en de EDPB Guidelines 03/2022 on Deceptive Design Patterns.',
  policyLinkText: 'Lees ons volledig cookie- en privacybeleid',
  legalBasis:
    'Wet van 13 juni 2005 betreffende de elektronische communicatie, art. 129 (omzetting ePrivacy-richtlijn ' +
    '2002/58/EG, zoals gewijzigd door 2009/136/EG); AVG/GDPR art. 4(11) en art. 7 voor de geldigheidsvereisten ' +
    'van toestemming (vrij, specifiek, geïnformeerd, ondubbelzinnig, en even eenvoudig in te trekken als te geven).',
};

export interface HealthDataConsentTemplate {
  title: string;
  bodyText: string;
  dataCategories: string[];
  purpose: string;
  checkboxLabel: string;
  withdrawalReminder: string;
  legalBasis: string;
  /** Mag nooit vooraf aangevinkt zijn: toestemming voor bijzondere persoonsgegevens moet een actieve handeling zijn. */
  defaultChecked: false;
}

export const HEALTH_DATA_CONSENT_TEMPLATE: HealthDataConsentTemplate = {
  title: 'Toestemming voor verwerking van gezondheidsgegevens',
  bodyText:
    'Om u een gepersonaliseerd voedings- en gewichtsplan te kunnen aanbieden, verwerken wij gegevens die onder ' +
    'de Algemene Verordening Gegevensbescherming (AVG/GDPR, art. 9) gelden als bijzondere categorieën van ' +
    'persoonsgegevens ("gezondheidsgegevens"). Het gaat onder meer om uw lichaamsgewicht, uw streefgewicht, uw ' +
    'calorie- en voedingsinname, en eventuele allergieën of voedingsbeperkingen die u opgeeft. Wij verwerken ' +
    'deze gegevens uitsluitend op basis van uw uitdrukkelijke, actieve en vrijwillige toestemming (art. 9, lid ' +
    '2, onder a) AVG), en gebruiken ze enkel om uw persoonlijke caloriedoel, macronutriënten en voedingsadvies ' +
    'te berekenen en te tonen. Zonder deze toestemming kunnen wij deze functies niet aanbieden.',
  dataCategories: [
    'Lichaamsgewicht en streefgewicht',
    'Calorie- en macronutriënteninname',
    'Voedingspatroon, allergieën en intoleranties',
    'Activiteitsniveau',
  ],
  purpose:
    'Het berekenen en tonen van een gepersonaliseerd caloriedoel, macronutriëntenverdeling en voedingsadvies.',
  checkboxLabel:
    'Ik geef hierbij uitdrukkelijk, vrijwillig en actief mijn toestemming voor de verwerking van mijn ' +
    'hierboven beschreven gezondheidsgegevens voor dit doel. Ik begrijp dat ik deze toestemming niet hoef te ' +
    'geven om de overige, niet-gezondheidsgerelateerde functies van de app te kunnen gebruiken.',
  withdrawalReminder:
    'U kunt deze toestemming steeds intrekken. Intrekken is even eenvoudig als ze geven: ga naar Instellingen ' +
    '> Privacy > Toestemmingen en zet de schakelaar "Gezondheidsgegevens" uit. Het intrekken van uw toestemming ' +
    'doet geen afbreuk aan de rechtmatigheid van de verwerking vóór de intrekking, maar wij stoppen na ' +
    'intrekking met het verwerken van nieuwe gezondheidsgegevens en schakelen de functies die hierop steunen uit.',
  legalBasis:
    'AVG/GDPR art. 9, lid 2, onder a) (uitdrukkelijke toestemming voor de verwerking van bijzondere categorieën ' +
    'van persoonsgegevens), in combinatie met art. 6, lid 1, onder a), en art. 7 (voorwaarden voor toestemming).',
  defaultChecked: false,
};

export interface SaasWithdrawalDisclaimerTemplate {
  title: string;
  traderIdentification: string;
  checkboxLabel: string;
  confirmationEmailSubject: string;
  confirmationEmailBody: string;
  legalBasis: string;
  /** Mag nooit vooraf aangevinkt zijn: het verlies van het herroepingsrecht vereist een uitdrukkelijke, actieve erkenning. */
  defaultChecked: false;
}

export const SAAS_WITHDRAWAL_DISCLAIMER: SaasWithdrawalDisclaimerTemplate = {
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
  confirmationEmailSubject:
    'Bevestiging van uw instemming met onmiddellijke levering en verlies van uw herroepingsrecht',
  confirmationEmailBody:
    'Beste klant, hierbij bevestigen wij op deze duurzame drager (e-mail) dat u op [datum en tijdstip] ' +
    'uitdrukkelijk heeft ingestemd met de onmiddellijke levering van [naam van de app] als digitale dienst bij ' +
    'de start van uw betaalde abonnement, en dat u daarbij uitdrukkelijk heeft erkend uw wettelijke ' +
    'herroepingsrecht van 14 dagen te verliezen, overeenkomstig artikel VI.53, 13° van het Wetboek van ' +
    'Economisch Recht (WER). [Maatschappelijke naam van de onderneming], KBO-nummer [BE0XXX.XXX.XXX], ' +
    'btw-nummer [BEXXXXXXXXXX], [geografisch adres, België]. Voor vragen over uw abonnement of om te ' +
    'annuleren, contacteer ons via [contactgegevens].',
  legalBasis:
    'Artikel VI.53, 13° Wetboek van Economisch Recht (WER) — uitsluiting van het herroepingsrecht bij de ' +
    'levering van digitale inhoud die niet op een materiële drager is geleverd, wanneer de uitvoering is ' +
    'begonnen met uitdrukkelijke voorafgaande toestemming van de consument en diens uitdrukkelijke erkenning ' +
    'dat hij zijn herroepingsrecht daardoor verliest. Omzetting van artikel 16, onder m), Richtlijn 2011/83/EU ' +
    'betreffende consumentenrechten.',
  defaultChecked: false,
};
