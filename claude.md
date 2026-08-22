# Projectplan & Technische/Juridische Specificaties: AI Maaltijd-Tracker

Dit planningsbestand dient als blauwdruk voor de maaltijd-tracker applicatie en is specifiek gestructureerd om door **Claude Code** te worden ingelezen als projectcontext (bijvoorbeeld door de inhoud over te nemen in `CLAUDE.md` of `plan.md`). Door deze gedetailleerde standaarden lokaal op te slaan, profiteert het ontwikkelproces direct van *prompt caching*, wat de tokenkosten aanzienlijk verlaagt.

---

## 1. Project- & Conceptomschrijving

Een minimalistische, premium en uiterst gebruiksvriendelijke mobiele applicatie waarmee volwassenen (18+) hun voeding en gewicht onder controle kunnen houden. De app onderscheidt zich door de drempel voor het loggen van maaltijden nagenoeg weg te nemen met behulp van AI-gestuurde foto- en spraakherkenning.

*   **Doelgroep**: 18+ (focus op privacybewuste consumenten die een professionele, premium ervaring wensen).
*   **Verdienmodel**: SaaS-abonnement (Software-as-a-Service) met een 5-daagse gratis proefperiode die automatisch overgaat in een betaald abonnement, tenzij tijdig opgezegd.

---

## 2. Design- & UI-Stijl (Look & Feel)

De visuele identiteit volgt een premium en rustige uitstraling om dagelijks gebruik te stimuleren:
*   **Stijl**: Minimalistisch, modern, professioneel en premium (Donkere Modus standaard).
*   **Kleurenpalet**: Diepblauwe achtergronden, strakke witte typografie en subtiele neon-accenten (zoals neon-cyaan of neon-groen) voor knoppen, actieve statussen en voortgangsbalken.
*   **Navigatie**: Intuïtief dagscherm met directe snelkoppelingen naar de camera (foto) en de microfoon (spraak).

---

## 3. Functionele Specificaties (Features)

### A. Onboarding & Setup (6 Fasen)
Bij de eerste opstart doorloopt de gebruiker de volgende stappen om een persoonlijk profiel en caloriedoel op te stellen:

1.  **Fase 1 — Het doel**:
    *   *Vraag*: Wat wil je bereiken? *(Opties: Afvallen / Spiermassa opbouwen / Op gewicht blijven of gezonder leven / Aankomen)*
    *   *Vraag (optioneel)*: Wat maakt dit nu belangrijk voor je? *(Opties: Meer energie, er beter uitzien, sportprestaties, gezondheid/advies arts, anders)*
2.  **Fase 2 — Over jou**:
    *   *Vragen*: Geslacht *(Man / Vrouw / Liever niet zeggen of non-binair)*, Leeftijd (of geboortedatum), Lengte (cm), Huidig gewicht (kg).
3.  **Fase 3 — Beweging**:
    *   *Vraag*: Hoe actief ben je op een gemiddelde dag? *(Opties: Weinig / Licht / Matig / Zeer / Extreem actief)*
4.  **Fase 4 — Doelspecifiek** *(Dynamisch tonen op basis van Fase 1)*:
    *   *Bij Afvallen/Aankomen*: Wat is je streefgewicht? + Hoe snel wil je dit bereiken? *(Opties: Rustig / Gemiddeld / Ambitieus)*
    *   *Bij Spiermassa opbouwen*: Hoeveel dagen per week wil je trainen?
5.  **Fase 5 — Voorkeuren**:
    *   *Vraag*: Volg je een bepaald voedingspatroon? *(Opties: Geen voorkeur / Vegetarisch / Veganistisch / Halal-Koosjer / Low-carb-Keto / Anders)*
    *   *Vraag (meerkeuze)*: Heb je allergieën of ingrediënten die je vermijdt?
    *   *Vraag*: Hoeveel maaltijden eet je per dag en rond welke tijden?
6.  **Fase 6 — Berekening & Onthulling**:
    *   *Scherm*: Geen vraag. Toont direct het berekende gepersonaliseerde plan: dagelijks caloriedoel, macronutriënten en de geschatte einddatum van het doel.

### B. Daily Tracker & Parameters
*   **Parameters**: Calorieën (kcal), Proteïnen (g), Vezels (g) en Vitamines.
*   **Weergave**: Voortgangsbalken gebaseerd op de *Dagelijkse Aanbevolen Hoeveelheid (DAH)*, passend bij het onboarding-profiel.
*   **AI Maaltijdscanner (Foto)**:
    *   Gebruiker neemt een foto van het bord.
    *   De backend stuurt de foto naar de Vision API (bijv. Claude Sonnet).
    *   De AI identificeert de ingrediënten, schat de porties (grammen) en berekent de voedingswaarden.
    *   Dit wordt **stilzwijgend toegevoegd** aan het logboek, maar de gebruiker krijgt direct een melding en de optie om de hoeveelheden achteraf handmatig aan te passen (bijvoorbeeld bij een tweede portie).
*   **AI Spraaklogger (Voice)**:
    *   Gebruiker spreekt in: *"Ik heb net twee volkoren boterhammen met jonge kaas gegeten"*.
    *   De audio wordt via Speech-to-Text omgezet en door NLP (Natural Language Processing) gestructureerd naar voedingswaarden.
    *   De maaltijd wordt **automatisch toegevoegd**, met een duidelijke optie voor de gebruiker om de invoer met één druk op de knop te verwijderen.

### C. Gamification, Community & Rapportage
*   **Wekelijkse Aanbevelingen**: Elke week genereert een "AI Coach" een gepersonaliseerd rapport gebaseerd op de loggegevens. Dit rapport is geschreven in een empathische, menselijke en motiverende toon (bijv. *"Je hebt deze week je vezeldoel uitstekend behaald, maar probeer komende week bij het ontbijt wat extra fruit te nemen voor je vitaminen"*).
*   **Competitie tegen jezelf**: Streaks (aantal opeenvolgende dagen gelogd) en badges voor het behalen van specifieke mijlpalen (bijv. "7 dagen vezel-koning").
*   **Social & Recepten**: Gebruikers kunnen vrienden toevoegen om kleine communities te vormen en recepten uit te wisselen.
*   **Toekomstige feature**: Automatische groepscreatie. De app groepeert gebruikers met gelijkaardige doelen (bijv. "Spiermassa opbouwen 4x trainen") in kleine in-app communities waar tips en recepten gedeeld kunnen worden.

---

## 4. Technische Architectuur

*   **Frontend**: React Native met TypeScript (voor een native Android & iOS ervaring vanuit één codebase).
*   **Backend**: Node.js met Express (TypeScript) of Python (FastAPI).
*   **Database**: PostgreSQL voor gebruikersprofielen, doelen en maaltijdhistorie.
*   **AI Verwerking**: Integratie met de Anthropic API (Claude Sonnet voor Vision en tekststructurering).
*   **Containerisatie**: Docker (Dockerfile in de root van het project).
*   **Hosting**: Backend live op Northflank (gekoppeld aan GitHub voor automatische CI/CD redeployments bij elke push).

---

## 5. Belgische IP- & Compliance-richtlijnen

Tijdens het programmeren met Claude Code moeten de volgende wettelijke standaarden (Belgisch & Europees recht) strikt in de code en flows worden geïntegreerd:

### A. Intellectuele Eigendom (IP)
*   **Unieke Code**: Alle functionele code wordt vanaf nul gegenereerd of handmatig geschreven. Concepten en ideeën zijn vrij onder het Belgische auteursrecht (Boek XI, Titel 6 WER), maar de concrete broncode moet volledig eigen intellectuele eigendom zijn om auteursrechtelijke bescherming te genieten.
*   **Geen Decompilatie**: De code van bestaande propriëtaire apps mag nooit worden gedecopileerd of gekopieerd om deze app te bouwen.
*   **Open-Source Licenties**: Vermijd het gebruik van copyleft (GPL) code om te voorkomen dat de app-code verplicht openbaar moet worden gemaakt. Permissieve licenties (MIT, Apache 2.0) zijn wel toegestaan.

### B. GDPR & Gezondheidsgegevens
*   **Bijzondere Persoonsgegevens**: Gegevens over gewicht, calorieën, doelen en allergieën zijn gezondheidsgegevens onder de AVG/GDPR.
*   **Expliciete Toestemming**: Tijdens de onboarding (vóór Fase 1) moet de app een expliciete, actieve opt-in (toestemming) vragen voor het verwerken van deze gezondheidsgegevens, gekoppeld aan een duidelijke link naar de privacyverklaring.
*   **Verantwoordingsplicht**: Toestemmingslogs moeten veilig in de database worden bijgehouden.

### C. Apparaatmachtigingen (Camera & Microfoon)
*   **Actieve Toestemming**: Toegang tot de camera (voor foto's) en microfoon (voor spraak) moet via de native OS-machtigingen worden gevraagd op het moment dat de functie voor het eerst wordt gebruikt.
*   **Geen Dark Patterns**: Het weigeren van deze machtigingen mag het basishandmatig loggen in de app niet blokkeren.

### D. Consumentenrecht (Boek VI WER) & SaaS-voorwaarden
*   **Informatieplicht**: KBO-nummer, btw-nummer, maatschappelijke naam en geografisch adres moeten eenvoudig vindbaar zijn in de app (bijv. in het instellingenscherm).
*   **Abonnement & Proefperiode**: De 5-daagse gratis trial moet transparant worden gecommuniceerd.
*   **Uitsluiting Herroepingsrecht**: Omdat het om de directe levering van digitale inhoud gaat, moet de consument bij het starten van de trial/het abonnement vooraf uitdrukkelijk instemmen met de directe levering tijdens de herroepingstermijn van 14 dagen, en expliciet erkennen dat hij daarmee zijn herroepingsrecht verliest. Dit moet contractueel per mail worden bevestigd op een duurzame drager.
