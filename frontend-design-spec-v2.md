# Frontend Architectuur & UI/UX Design Specificaties - Maaltijd Tracker (Belgische Markt) - Versie 2

Dit document dient als het ultieme blueprint- en specificatiebestand voor de mobiele app (React Native / Expo / TypeScript). Het is ontworpen om in één keer aan Claude Code gevoed te worden via een prompt, zodat de complete frontend-applicatie gestructureerd, visueel aantrekkelijk en juridisch compliant gebouwd kan worden.

---

## 1. Algemene Design & Stijlgids (Look-and-Feel)
De visuele stijl is gebaseerd op een rustgevende, gezonde en minimalistische esthetiek met een zachte, afgeronde interface om de drempel voor gebruikers zo laag mogelijk te houden. De app ondersteunt zowel **Light Mode** als **Dark Mode**, waarbij de gebruiker zelf zijn voorkeur kan instellen of de app de systeemvoorkeuren kan laten volgen.

### Kleurenpalet (Conform `SnapMacro_Kleuren.md`)
Het kleurenpalet is ontworpen om rust, gezondheid en betrouwbaarheid uit te stralen. De neutrale basis vult circa 85% van de interface, terwijl macro- en statuskleuren uitsluitend functioneel worden gebruikt (nooit ter decoratie).

#### 1.1 Neutrale Basis (Ongeveer 85% van de interface)
*   **Pagina-achtergrond (Light)**: `#FAFAF7` (Zeer licht, warm off-white voor een zachte uitstraling)
*   **Pagina-achtergrond (Dark)**: `#121210`
*   **Kaart- & Containerachtergrond (Light)**: `#FFFFFF` (Zuiver wit)
*   **Kaart- & Containerachtergrond (Dark)**: `#1E1E1B`
*   **Lichte rand / Scheidingslijn**: `#E8E6DF`
*   **Sterkere rand / Focuslijn**: `#D3D1C7`
*   **Primaire tekst**: `#2C2C2A` (Nooit puur zwart, om vermoeidheid van de ogen te voorkomen)
*   **Secundaire tekst**: `#5F5E5A`
*   **Gedempte / Muted tekst**: `#888780`

#### 1.2 Macro-kleuren (Functioneel gebruikt voor ringen, grafieken, en labels per maaltijd)
*   **Eiwitten (Protein)**: `#1D9E75` (Fris smaragdgroen) — *Lichte vulling achtergrond*: `#E1F5EE`
*   **Koolhydraten (Carbs)**: `#EF9F27` (Warm amber/oranje) — *Lichte vulling achtergrond*: `#FAEEDA`
*   **Vetten (Fats)**: `#378ADD` (Helder oceaanblauw) — *Lichte vulling achtergrond*: `#E6F1FB`

#### 1.3 Status- & Accentkleuren (Uitsluitend voor feedback en primaire handelingen)
*   **Succes / Doel gehaald**: `#639922` (Natuurlijk groen)
*   **Waarschuwing**: `#BA7517` (Goudbruin)
*   **Fout / Over de grens**: `#E24B4A` (Koraalrood)
*   **Accent / Hoofdknop per scherm**: `#185FA5` (Betrouwbaar kobaltblauw)

*Opmerking: De eetfoto's die de gebruiker zelf maakt, vormen het enige echt kleurrijke, decoratieve element in de app.*

### Typografie & Spacing
*   **Kopteksten**: Afgeronde of semi-serif lettertypes (bijv. Nunito of System Default Bold) voor een vriendelijke en menselijke toon.
*   **Broodtekst**: Clean sans-serif (Inter of System Default).
*   **Randen**: Alle kaarten, containers en invoervelden gebruiken een consistente `border-radius` van `16` tot `20` pixels voor een zacht en modern uiterlijk.
*   **Schaduwen**: Zeer subtiele schaduwen (`elevation: 2` op Android, `shadowOpacity: 0.04` op iOS) om diepte te creëren zonder rommelig over te komen.

---

## 2. Navigatiestructuur & Mappenindeling (Expo Router)
De app maakt gebruik van Expo Router voor bestandsgebaseerde, type-veilige navigatie. De mappenstructuur onder `frontend/src/app/` is als volgt ingericht:

```plaintext
frontend/src/app/
├── (auth)/
│   ├── login.tsx             # Login-scherm
│   └── register.tsx          # Registratie-scherm
├── (onboarding)/
│   ├── index.tsx             # Cookiebanner & Privacy Gate (ePrivacy / GBA)
│   ├── consent.tsx           # Gezondheidsdata-toestemming (GDPR Art. 9)
│   └── setup.tsx             # Stapsgewijze Onboarding Slider (Fase 1-5)
├── (tabs)/
│   ├── _layout.tsx           # Bottom Tab Navigator (Home, Dagboek, Voortgang, Profiel)
│   ├── index.tsx             # Home Dashboard (Hoofdscherm conform mockup)
│   ├── diary.tsx             # Eetdagboek (Vandaag gelogd / Barcodezoeker / Maaltijden)
│   ├── progress.tsx          # Voortgang (Grafieken, Badges & Streaks en Coach-archief)
│   └── profile.tsx           # Profiel, Abonnement (WER disclaimer) & Instellingen
└── _layout.tsx               # Root Layout (Provider, Global State, API setup)
```

---

## 3. Scherm-by-Scherm Specificaties & Gebruikersstromen

### Scherm 1: De ePrivacy Cookiebanner Gate (`(onboarding)/index.tsx`)
Dit scherm verschijnt als een blokkerende pop-up of scherm bij het allereerste opstarten van de app en regelt de cookie- en ad-consents conform de Belgische GBA-richtlijnen.

*   **Visuele Hiërarchie**:
    *   Bovenaan een vriendelijke, rustgevende illustratie en een heldere uitleg over het gebruik van cookies en trackers.
    *   In het midden drie specifieke, granulaire switches (nooit vooraf aangevinkt, behalve de noodzakelijke!):
        1.  **Strikt Noodzakelijk** (Altijd aan, verplicht en vooraf geactiveerd voor opslag van voorkeuren).
        2.  **Analytische Cookies** (Opt-in, voor anonieme app-optimalisatie).
        3.  **Gepersonaliseerde Advertenties** (Opt-in, voor gerichte advertenties in de gratis versie).
    *   Onderaan twee knoppen die **visueel exact evenveel nadruk** krijgen (om dark patterns/deceptive designs volgens de EDPB en de Belgische GBA te vermijden):
        *   `Alles Weigeren` (Muted grijze achtergrond `#E8E6DF`, donkere tekst `#2C2C2A`).
        *   `Alles Accepteren` (Kobaltblauwe `#185FA5` achtergrond, witte tekst).
*   **Interactie-logica**:
    *   Slaat de keuzes op via de backend-aanroep `setAdConsent(userId, analytics, personalized)`.
    *   De advertentietoestemming is maximaal 6 maanden geldig. Na 6 maanden vervalt deze automatisch en vraagt de app opnieuw om toestemming.
    *   Gebruikers die weigeren, krijgen nog steeds toegang tot de gratis app, maar krijgen dan niet-gepersonaliseerde (contextuele) advertenties te zien.

### Scherm 2: Het GDPR Gezondheidsconsent Scherm (`(onboarding)/consent.tsx`)
Dit scherm is een verplichte juridische poort voorafgaand aan de onboarding, aangezien het bijhouden van calorieën, maaltijden en gewicht onder de AVG (GDPR) geldt als de verwerking van gevoelige gezondheidsgegevens.

*   **Visuele Hiërarchie**:
    *   Duidelijke kop: "Jouw Gezondheid, Jouw Regels".
    *   Een heldere, AVG-conforme toestemmingsverklaring (Artikel 9) die uitlegt dat gewichts-, calorische en maaltijdgegevens uitsluitend worden verwerkt om persoonlijke doelen te berekenen en bij te houden.
    *   Een opvallende herinnering: *"Je kunt deze toestemming op elk moment met één klik weer intrekken in je profielinstellingen. Intrekken is even eenvoudig als geven."*
    *   Een enkele, niet-vooraf-aangevinkte Checkbox (`defaultChecked: false`): *"Ik geef expliciet toestemming voor het verwerken van mijn gewichts- en voedingsgegevens."*
    *   Een grote actieknop "Volgende" (Accentkleur `#185FA5`) die pas actief wordt zodra de checkbox is aangevinkt.
*   **Interactie-logica**:
    *   Bij akkoord roept de app `setHealthDataConsent(userId, true)` aan in de backend, wat de GDPR-poort in de database opent.

### Scherm 3: De Onboarding Slider (`(onboarding)/setup.tsx`)
Een stapsgewijze slider waar de gebruiker vloeiend doorheen glijdt om zijn profiel op te zetten (Fase 1 t/m 5). De pagina's verspringen (schuiven door) direct per ingevuld antwoord voor een snelle, naadloze onboarding.

*   **De 5 Stappen**:
    *   **Stap 1: Doel Kiezen**: Grote kaarten met iconen voor: `Afvallen`, `Aankomen`, `Spiermassa opbouwen`, `Gewicht behouden`, `Gezond leven`.
    *   **Stap 2: Persoonlijke Gegevens**: Vriendelijke selectoren voor Geslacht (`Man`, `Vrouw`, `Unspecified`) en Geboortedatum.
    *   **Stap 3: Afmetingen**: Prachtige, nauwkeurige schuifbalken of invoervelden voor Lengte (cm) en Gewicht (kg).
    *   **Stap 4: Activiteitsniveau**: Kaarten voor `Zittend`, `Licht actief`, `Gemiddeld actief`, `Extreem actief` met duidelijke omschrijvingen van dagelijkse beweging.
    *   **Stap 5: Doel-tempo**: Selectie voor het gewenste tempo (`Rustig`, `Gemiddeld`, `Ambitieus`).
*   **Interactie-logica**:
    *   Bij het afronden stuurt de app alle verzamelde gegevens naar het backend endpoint `/api/onboarding/complete`. 
    *   De backend berekent de BMR (Mifflin-St Jeor) en macro's en geeft de `DailyTarget` en `WeeklyGoal` terug, die direct lokaal in de app worden opgeslagen.

### Scherm 4: Het Home Dashboard (`(tabs)/index.tsx`)
*Dit scherm is ontworpen conform de opgeladen mockup-afbeelding `eerste scherm app.png`.*

*   **Visuele Hiërarchie & Componenten**:
    *   **Header**: 
        *   Muted datum aan de linkerkant (bijv. *"Dinsdag 24 augustus"*).
        *   Rechtsboven een ronde profiel-avatar met de initiaal van de gebruiker (bijv. *"S"*) in een mintgroene cirkel.
        *   Daaronder de grote, vetgedrukte begroeting: *"Goedemorgen, Sam"*.
        *   **Streak-indicator**: Naast de naam of bovenaan staat een rustig, discreet streak-symbooltje (een klein oranje vlammetje met het getal *"7"* 🔥) om de streak top-of-mind te houden zonder het scherm vol te bouwen.
    *   **Calorieën Kaart**: Een witte, afgeronde kaart met een lichte rand (`#E8E6DF`):
        *   *Linkerkant*: Een prachtige, cirkelvormige voortgangsring (calorieteller) met in het midden de tekst **"850"** in grote, donkere cijfers, en daaronder in kleine, gedempte letters "kcal over".
        *   *Rechterkant*: 
            *   De harde cijfers: *"Doel 2.000 | 1.150 gegeten"* met daaronder een dunne, blauwe voortgangsbalk.
            *   Drie gekleurde, horizontale voortgangsbalken voor de macro-targets:
                *   **Eiwit** (Smaragdgroen `#1D9E75`): *"68 / 130g"*
                *   **Koolh.** (Warm oranje `#EF9F27`): *"140 / 200g"*
                *   **Vet** (Oceaanblauw `#378ADD`): *"38 / 65g"*
    *   **Wekelijkse Coach Trigger-Kaart**: Als er een nieuw weekrapport klaar is (bijvoorbeeld maandagochtend), verschijnt er direct onder de calorieënkaart een opvallende, maar makkelijk weg te klikken kaart: *"Je weekrapport is klaar →"*. Deze kaart verdwijnt permanent van het startscherm zodra de gebruiker erop klikt om het rapport te bekijken.
    *   **Hoofd-CTA (Maaltijd Toevoegen)**: Een opvallende, brede knop in kobaltblauw (`#185FA5`) met een camera-icoon en de tekst **"Fotografeer je maaltijd"**. 
        *   *Interactie*: Bij het klikken op deze knop of via een "+" knop opent een stijlvol bottom sheet (keuzemenu) met de drie opties:
            1.  `Foto` 📷 (Premium AI-scanner)
            2.  `Inspreken` 🎙️ (Premium Spraak-logger)
            3.  `Handmatige invoer` ✍️ (Gratis barcode- en productzoeker)
    *   **Dynamische Suggestiekaart ("Volgende maaltijd")**: Een lichtgekleurde, afgeronde kaart met een gloeilamp-icoon:
        *   *Tekst*: *"Je hebt vanavond nog 62g eiwit en 60g koolhydraten nodig. Probeer:"*
        *   *Maaltijdopties*: Twee klikbare, horizontale kaarten met specifieke suggesties en hun macro's:
            *   `Kip (150g) + rijst (100g)` (35p • 46k • 5v)
            *   `Griekse yoghurt + granola` (18p • 20k • 3v)
    *   **Vandaag Gelogd Sectie**: 
        *   Koptekst *"Vandaag gelogd"* met aan de rechterkant een klikbare tekst link *"Alles zien"* die direct navigeert naar het Dagboek-tabblad.
        *   Een lijst met maaltijden. Elke rij toont een maaltijd-icoon (bijv. een koffiebeker voor ontbijt), de naam *"Havermout met banaan"*, de subtext *"Ontbijt • 08:15"*, en aan de rechterkant de calorieën *"420"*.

### Scherm 5: Eetdagboek & Productzoeker (`(tabs)/diary.tsx`)
Het dagboek biedt de mogelijkheid om maaltijden handmatig te zoeken en te loggen (gratis), of gebruik te maken van de geavanceerde AI-scanners (Premium).

*   **Handmatig Zoeken (Gratis)**:
    *   Een prominente zoekbalk met de tekst *"Zoek een product of barcode..."*.
    *   Er verschijnt direct een autocomplete-lijst met Belgische supermarktproducten (LU, Campina, Colruyt, Delhaize, etc.) gekoppeld aan onze `ProductService` cache van Open Food Facts.
    *   Productkaarten tonen de naam, het merk, de Nutri-Score en een "+" knop.
    *   Bij klikken op "+" opent een modal om de grammen aan te passen en de maaltijd (Ontbijt, Lunch, Diner, Snack) te selecteren.
*   **Foto- & Spraak-Scans (Premium)**:
    *   **Foto Scan**: De camera opent in de app. Na het nemen van de foto toont de AI-herkenningsservice een lijst met geïdentificeerde ingrediënten en geschatte grammen met schuifbalken. De gebruiker kan de grammen direct handmatig corrigeren alvorens op "Loggen" te tikken.
    *   **Spraak Logger**: De gebruiker spreekt een maaltijd in (bijv. *"Twee boterhammen met pindakaas"*). De app zet dit via spraakherkenning om naar tekst, toont een popup om de tekst te verifiëren en te bevestigen, waarna de AI de maaltijd direct in losse items ontleedt en wegschrijft.

### Scherm 6: Voortgang, Streaks & Badges (`(tabs)/progress.tsx`)
Dit scherm is de thuisbasis voor gamification, streaks, badges en het wekelijkse coach-archief.

*   **Streaks & Badges Logica**:
    *   Toont de volledige badge-collectie. Behaalde badges worden in kleur getoond, nog te behalen badges zijn grijs/vervaagd met de specifieke voorwaarde eronder getoond (bijv. *"Log 7 dagen op rij"* of *"Behaal je eiwitdoel 5 keer in een week"*). Dit motiveert en stelt duidelijke doelen.
    *   **Behaal-moment (Dopamine-hit)**: Wanneer de gebruiker een badge of streak behaalt, wordt er **direct ter plekke** (waar de gebruiker zich in de app bevindt, bijv. op Home of in het Dagboek na het loggen) een korte, feestelijke viering getoond. Een animatie waarbij de badge inzoomt met confetti of subtiele beweging, wat zorgt voor een onmiddellijke positieve bekrachtiging.
    *   **Gezonde Framing (Cruciaal!)**: Badges en streaks zijn geformuleerd rondom **consistentie en het behalen van eigen doelen** (bijv. *"7 dagen op rij gelogd"*, *"Eiwitdoel deze week gehaald"*, *"Streefbereik aangehouden"*). We vermijden morele termen zoals "goed gegeten" of "slecht gegeten" om een rigide of ongezonde relatie met voeding te voorkomen.
    *   **Zachte Streak-Reset**: Als een gebruiker een dag mist, wordt de streak niet hard of bestraffend afgebroken. In plaats daarvan tonen we een vriendelijke, uitnodigende boodschap: *"Welkom terug! Een nieuwe streak begint vandaag. Samen pakken we de draad weer op."*
*   **Wekelijks AI-Coach Archief**:
    *   Een historisch overzicht van alle eerdere weekrapporten. Gebruikers kunnen door eerdere weken scrollen om langetermijntrends te ontdekken.
    *   **Het Rapport**: Een kort, zeer verteerbaar scherm met een paar heldere grafieken (macro-verdeling over de week en consistentie) en **maximaal 2 tot 3 concrete, vriendelijke suggesties** voor de komende week (bijv. *"Je eiwit zat vaak laag rond het avondeten — probeer volgende week een eiwitrijke snack rond 16:00"*). Het aantal suggesties blijft bewust laag om de gebruiker te motiveren in plaats van te overweldigen.

### Scherm 7: Profiel, SaaS-Abonnement & Instellingen (`(tabs)/profile.tsx`)
Beheerscherm voor accountinstellingen, privacyrechten en het premium-abonnement.

*   **Abonnementsbeheer**:
    *   Toont de Pro-voordelen: AI-maaltijdscanner (Foto AI) en AI-spraaklogger (Spraak AI).
    *   Prijsstelling: €9,99 per maand na een proefperiode van 5 dagen.
    *   **De Wettelijke Checkbox (WER)**: Een verplichte, niet-vooraf-aangevinkte checkbox met de exacte, conforme disclaimertekst volgens artikel VI.53, 13° WER:
        > [ ] *"Ik stem uitdrukkelijk in met de onmiddellijke levering van de digitale diensten van het Premium-abonnement en erken dat ik hiermee mijn herroepingsrecht van 14 dagen verlies zodra de levering start, conform artikel VI.53, 13° van het Belgische Wetboek van Economisch Recht."*
    *   De knop "Start Proefperiode" of "Abonneren" blijft onbruikbaar (grijs) totdat deze checkbox expliciet is aangevinkt.
*   **GDPR-Privacybeheer**:
    *   Gemakkelijke switches om de advertentie- en analytische toestemmingen op elk moment in te trekken of aan te passen.
    *   Een grote, rode knop "Verwijder Mijn Account & Alle Gezondheidsdata" die alle persoons- en gezondheidsgegevens direct conform de AVG definitief wist uit onze backend.

---

## 5. API-Integratie Contracten (Live Northflank Server)
De frontend communiceert rechtstreeks met de live Express-backend op Northflank:
`https://p01--ideale-lichaam--kbd9hgdzc7ny.code.run`

### Integratie-eisen voor de API
1.  **Onboarding Voltooien**:
    *   `POST /api/onboarding/complete`
    *   Payload: `{ sex, birthDate, heightCm, weightKg, activityLevel, dietaryPattern, goalType, pace, timezone }`
    *   Response: `{ user, dailyTarget, weeklyGoal }`
2.  **Producten Zoeken (Gratis)**:
    *   `GET /api/products/search?queryOrBarcode=...`
    *   Response: `[ { id, barcode, name, brand, caloriesKcal, proteinG, carbsG, fatG, fiberG } ]`
3.  **Maaltijd Handmatig Loggen**:
    *   `POST /api/meals/log`
    *   Payload: `{ localDate, mealType, items: [ { name, amountG, caloriesKcal, proteinG, carbsG, fatG, fiberG } ] }`
4.  **AI-Foto Herkenning (Premium)**:
    *   `POST /api/ai/recognition/photo` (Controleert in de backend op `user.is_premium` en `health_data_consent`)
    *   Response: `{ mealLog, items: [...] }`
5.  **AI-Spraak Herkenning (Premium)**:
    *   `POST /api/ai/recognition/voice` (Controleert in de backend op `user.is_premium` en `health_data_consent`)
    *   Payload: `{ speechText }`
    *   Response: `{ mealLog, items: [...] }`
6.  **Wekelijkse Coach & Streaks**:
    *   `GET /api/coach/weekly-report?weekStartDate=...`
    *   `POST /api/coach/streaks/update`
    *   Response: `{ streak, badgesAwarded: [...] }`
