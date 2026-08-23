# Maaltijd Tracker — Frontend

De mobiele app (React Native + Expo Router + TypeScript) van de AI-maaltijdtracker. Praat via
[`src/services/api.service.ts`](./src/services/api.service.ts) met de backend uit de hoofdmap van
deze repository.

## Vereisten

- Node.js 20 of hoger en npm
- De [Expo Go](https://expo.dev/go)-app op je telefoon (snelste manier om te testen), **of**
  Xcode (iOS-simulator, enkel op macOS) / Android Studio (Android-emulator)

## Lokaal opstarten

```bash
cd frontend
npm install
npm start
```

Dit start de Expo-ontwikkelserver met een QR-code. Scan die met de Expo Go-app (Android: camera-app
of Expo Go zelf; iOS: standaard camera-app) om de app op je eigen telefoon te openen, of kies in het
terminalmenu:

```bash
npm run android   # opent in de Android-emulator
npm run ios       # opent in de iOS-simulator (enkel macOS)
npm run web       # opent in de browser op http://localhost:8081
```

## Projectstructuur

Navigatie via Expo Router (bestandsgebaseerd), conform `frontend-design-spec-v2.md`:

```text
frontend/src/app/
├── index.tsx                 # Navigatiegate: (auth) / (onboarding) / (tabs) op basis van de sessie
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (onboarding)/
│   ├── index.tsx              # Cookiebanner & Privacy Gate (ePrivacy / GBA)
│   ├── consent.tsx            # Gezondheidsdata-toestemming (AVG art. 9)
│   └── setup.tsx              # Onboarding-slider (doel, gegevens, activiteit, tempo)
└── (tabs)/
    ├── _layout.tsx            # Bottom tab navigator (Home, Dagboek, Voortgang, Profiel)
    ├── index.tsx               # Home Dashboard
    ├── diary.tsx               # Eetdagboek & productzoeker
    ├── progress.tsx            # Streaks, badges & wekelijks coach-archief
    └── profile.tsx             # Abonnement (WER-disclaimer) & privacybeheer
```

Overige mappen:

```text
frontend/src/
├── screens/onboarding/    # CookieBanner.tsx, HealthDataConsentScreen.tsx, useOnboardingSetup.ts
├── screens/auth/          # useAuthNavigation.ts
├── services/              # api.service.ts, session.ts, legal-copy.ts
├── types/                 # api.types.ts, domain.types.ts
└── components/            # Button, Card, CalorieRing, MacroProgressBar, SelectableCard, ...
```

Sessie (ingelogde gebruiker, dagelijkse/wekelijkse doelen, behaalde badges) leeft **in-memory** in
`src/services/session.ts` — er is nog geen AsyncStorage/SecureStore geïnstalleerd, dus een
herlaad/herstart logt je uit. Zie de commentaren in dat bestand voor wat daarvoor nodig is.

## Backend-koppeling

`src/services/api.service.ts` wijst naar de live Northflank-URL van de backend
(`https://p01--ideale-lichaam--kbd9hgdzc7ny.code.run`) en implementeert alle endpoints uit
`frontend-design-spec-v2.md` §5 (onboarding, productzoeker, maaltijden loggen, AI-herkenning,
wekelijkse coach & streaks), plus `fetchHealthStatus()` voor `/health`. Draai je de backend liever
lokaal (zie de `Dockerfile` in de hoofdmap van de repository), pas dan `API_BASE_URL` in dat bestand
aan naar bijvoorbeeld `http://localhost:3000`.

> **Nog niet geïmplementeerd in de backend:** de endpoints voor authenticatie (`/api/auth/*`),
> consentbeheer (`/api/consent/*`) en accountverwijdering (`/api/account`) staan niet in het
> gedocumenteerde API-contract van §5 — `api.service.ts` bevat hiervoor een expliciet gemarkeerde,
> voorlopige aanname. De backend heeft momenteel ook geen enkele van de §5-routes geïmplementeerd
> (enkel `/health` bestaat al); dit is dus het frontend-contract dat de backend nog moet volgen.

> **Let op — juridische teksten:** `src/services/legal-copy.ts` is een handmatig gesynchroniseerde
> kopie van `../src/compliance/consent-templates.ts` in de backend (de twee zijn aparte
> TypeScript-projecten zonder gedeeld package). Wijzig je de teksten in de backend, werk dan ook dit
> bestand bij.

## Bekende beperkingen van deze iteratie

- **Camera/spraak (Premium)**: de knoppen voor foto-scan en spraaklogger tonen een duidelijke
  placeholder-melding; de echte `expo-camera`/spraak-naar-tekst-integratie is nog niet gebouwd.
- **Geboortedatum**: eenvoudig tekstveld (`JJJJ-MM-DD`) in plaats van een native datumkiezer.
- **"Vandaag gelogd"** op het Home Dashboard toont enkel wat je deze sessie zelf logt: er is geen
  backend-endpoint dat de maaltijden van vandaag ophaalt.
- **Weekrapport-archief**: navigeert week per week via `GET /api/coach/weekly-report`
  (`weekStartDate` aanpassen); er is geen apart lijst-/archiefendpoint.
- Splash screen toont nog de standaard Expo-branding (geen eigen app-logo/asset aanwezig).

## Problemen oplossen

- **Metro-cache lijkt verouderd**: start met `npx expo start -c` om de bundler-cache te wissen.
- **Wijzigingen aan `app.json` of native dependencies**: herstart de dev server volledig (stop met
  `Ctrl+C`, start opnieuw met `npm start`).
