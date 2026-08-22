# Databaseplan maaltijd-tracker

## 0. Backend-mappenstructuur

Aanbevolen structuur voor een TypeScript/Node.js backend met een dunne API-laag en duidelijke domeinmodules:

```text
backend/
├── src/
│   ├── config/              # Omgevingsvariabelen en runtimeconfiguratie
│   ├── db/
│   │   ├── client.ts        # PostgreSQL connection pool
│   │   ├── migrations/      # SQL-migraties, in uitvoervolgorde
│   │   └── seeds/            # Alleen lokale/demo-data
│   ├── modules/
│   │   ├── users/           # Account, onboarding en GDPR-consent
│   │   ├── goals/           # Doelen, daily targets en weekly goals
│   │   ├── meals/           # Meal logs en meal items
│   │   ├── nutrition/       # Voedingsdatabronnen en berekeningen
│   │   └── recognition/     # Foto/spraak-verwerking en AI-resultaten
│   ├── middleware/          # Auth, validatie, foutafhandeling en logging
│   ├── shared/              # Types, errors, paginatie en utilities
│   ├── app.ts               # Express/Fastify app-configuratie
│   └── server.ts            # HTTP-server entrypoint
├── tests/
│   ├── integration/         # API- en PostgreSQL-tests
│   └── unit/                # Domeinlogica
├── package.json
├── tsconfig.json
└── .env.example
```

Per module gebruiken we bij voorkeur `*.router.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts` en `*.types.ts`. SQL blijft in `src/db/migrations`; businesslogica hoort in services en niet in routehandlers.

## 1. Doel en uitgangspunten

Dit plan beschrijft het relationele datamodel voor de volledige maaltijd-tracker. De MVP uit `SnapMacro_PRD.md` gebruikt voorlopig `localStorage` en heeft geen accounts of cloud-sync. Het model hieronder is de doelarchitectuur voor zodra gebruikers, synchronisatie en privacygevoelige profielgegevens worden toegevoegd.

Uitgangspunten:

- PostgreSQL als primaire database.
- UUID's als publieke identifiers; geen oplopende gebruikers-ID's in API-responses.
- Alle tijden in UTC opslaan. De tijdzone van de gebruiker staat op het profiel en wordt gebruikt om een lokale eetdag te bepalen.
- Voedingswaarden opslaan als `numeric`, niet als floating-point.
- Een maaltijdlog is een gebruikersactie op hoofdniveau: corrigeren gebeurt door items of porties te wijzigen, verwijderen via een status.
- Alleen noodzakelijke gezondheidsgegevens opslaan, met retentie en verwijdering als onderdeel van het ontwerp.

## 2. MVP-kern

De eerste cloudversie heeft minimaal deze tabellen nodig:

1. `users`
2. `user_profiles`
3. `goals`
4. `daily_targets`
5. `weekly_goals`
6. `meal_logs`
7. `meal_items`
8. `recognition_runs`
9. `media_assets`

De MVP kan dezelfde concepten tijdelijk als één localStorage-document modelleren. Gebruik daarbij dezelfde veldnamen en relaties, zodat migratie naar PostgreSQL geen tweede domeinmodel introduceert.

## 3. Entiteiten

### 3.1 `users`

Identiteit en accountstatus. Authenticatiegegevens blijven bij de gekozen identity provider; sla in deze tabel alleen de providerreferentie op.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | Interne gebruikers-ID |
| `auth_provider` | text | Bijvoorbeeld `apple`, `google` of `email` |
| `auth_subject` | text | Uniek binnen de provider |
| `status` | text | `active`, `pending_deletion`, `deleted` |
| `timezone` | text | IANA-zone, bijvoorbeeld `Europe/Brussels` |
| `health_data_consent` | boolean | Verplicht; `true` betekent expliciete opt-in voor gezondheidsgegevens |
| `health_data_opted_in_at` | timestamptz nullable | Moment waarop de gebruiker expliciet opt-in gaf |
| `consent_policy_version` | text nullable | Versie van de getoonde privacy-/toestemmingstekst |
| `created_at`, `updated_at` | timestamptz | Auditvelden |

Constraints: `health_data_opted_in_at` is verplicht wanneer `health_data_consent = true`; gezondheidsdata mag alleen worden aangemaakt of gelezen wanneer de toestemming actief is. Een intrekking zet `health_data_consent` op `false` en bewaart het intrekkingsmoment in auditlogging. Unieke index op (`auth_provider`, `auth_subject`). Verwijder of anonimiseer accountdata via een gecontroleerd verwijderproces.

### 3.2 `user_profiles`

Versieerbare gezondheids- en voorkeurgegevens uit onboarding. Maak een nieuwe rij bij een wijziging, zodat historische berekeningen niet stilzwijgend veranderen.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | `users.id` |
| `valid_from`, `valid_to` | timestamptz | `valid_to` is null voor de actuele versie |
| `sex` | text nullable | Alleen opslaan als gebruiker dit deelt |
| `birth_date` | date nullable | Kies óf geboortejaar/-datum op basis van dataminimalisatie |
| `height_cm` | numeric(5,2) nullable | |
| `weight_kg` | numeric(6,2) nullable | |
| `activity_level` | text nullable | Gecontroleerde enumwaarde |
| `dietary_pattern` | text nullable | Bijvoorbeeld `vegetarian`, `vegan`, `halal` |
| `avoided_ingredients` | jsonb | Allergieën/intoleranties; versleutel gevoelige waarden op applicatieniveau |
| `meals_per_day` | smallint nullable | Bijvoorbeeld 3 |
| `meal_times` | jsonb | Lokale tijden per maaltijd |

Constraint: maximaal één actuele profielversie per gebruiker. Gewichtshistorie hoort in een aparte tabel als regelmatige metingen nodig zijn; overschrijf hiervoor niet telkens `weight_kg`.

### 3.3 `goals`

Een doel met een eigen levenscyclus. Zo blijven eerdere doelen en rapportages begrijpelijk.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `goal_type` | text | `lose_weight`, `gain_weight`, `build_muscle`, `maintain`, `healthy_living` |
| `target_weight_kg` | numeric(6,2) nullable | Alleen relevant voor gewichtdoelen |
| `training_days_per_week` | smallint nullable | Voor spiermassa-doel |
| `pace` | text nullable | `slow`, `moderate`, `ambitious` |
| `reason` | text nullable | Optionele onboardingkeuze |
| `starts_on`, `ends_on` | date nullable | |
| `status` | text | `active`, `completed`, `cancelled` |
| `created_at`, `updated_at` | timestamptz | |

Maximaal één `active` doel per gebruiker, tenzij later meerdere parallelle doelen expliciet worden ondersteund.

### 3.4 `daily_targets`

Dagelijkse doelwaarden als snapshot. De waarden mogen niet alleen live uit het profiel worden berekend: anders veranderen historische dashboards wanneer gewicht of doel wijzigt.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `target_date` | date | Lokale datum van de gebruiker |
| `goal_id` | uuid FK nullable | Doel waarop de berekening gebaseerd is |
| `calories_kcal` | numeric(8,2) | |
| `protein_g`, `carbs_g`, `fat_g`, `fiber_g` | numeric(8,2) | Macronutriënten/vezels |
| `micronutrients` | jsonb | Alleen ondersteunde vitamines/mineralen; eenheid per sleutel vastleggen |
| `calculation_version` | text | Versie van de berekeningsregels |
| `created_at` | timestamptz | |

Unieke constraint op (`user_id`, `target_date`). Als de berekening achteraf wordt aangepast, maak een nieuwe versie of bewaar een auditrecord; wijzig niet ongemerkt de betekenis van een reeds getoonde dag.

### 3.5 `weekly_goals`

Een weekdoel is een snapshot van de doelen die voor een volledige kalenderweek gelden. Dit voorkomt dat een wijziging in het gebruikersprofiel eerdere weekrapportages beïnvloedt.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `goal_id` | uuid FK nullable | Onderliggend onboarding-doel |
| `week_start` | date | Maandag in de tijdzone van de gebruiker |
| `week_end` | date | Zondag in de tijdzone van de gebruiker |
| `calories_kcal` | numeric(10,2) | Wekelijks caloriedoel |
| `protein_g`, `fiber_g` | numeric(10,2) | Wekelijkse proteïne- en vezeldoelen |
| `vitamins` | jsonb | Vitaminen/mineralen met vaste eenheden per sleutel |
| `calculation_version` | text | Versie van de doelberekening |
| `status` | text | `active`, `completed`, `cancelled` |
| `created_at`, `updated_at` | timestamptz | |

Unieke constraint op (`user_id`, `week_start`). `week_end` moet zeven dagen na `week_start` liggen. Dagelijkse targets blijven bestaan voor de dagelijkse UX; de wekelijkse doelen zijn de weekaggregatie en niet slechts een live query.

### 3.6 `meal_logs`

Een door de gebruiker bevestigde of automatisch aangemaakte eetregistratie.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `recognition_run_id` | uuid FK nullable | Herkenningsrun die dit log heeft opgeleverd |
| `media_asset_id` | uuid FK nullable | Optionele bronfoto of audio |
| `consumed_at` | timestamptz | Werkelijk eetmoment indien bekend |
| `local_date` | date | Afgeleid bij aanmaken; ondersteunt snelle dagqueries |
| `meal_type` | text nullable | `breakfast`, `lunch`, `dinner`, `snack` |
| `source` | text | `photo`, `voice`, `manual`, `suggestion` |
| `status` | text | `logged`, `edited`, `deleted` |
| `confidence` | numeric(4,3) nullable | AI-vertrouwen tussen 0 en 1 |
| `notes` | text nullable | Optionele gebruikersnotitie |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | |

Een log mag pas meetellen in dagtotalen wanneer de status niet `deleted` is. Index op (`user_id`, `local_date`, `status`).

### 3.7 `meal_items`

De afzonderlijke voedingsmiddelen binnen een log. Bewaar de geschatte portie en de waarden die op het moment van loggen zijn gebruikt.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `meal_log_id` | uuid FK | Verwijst naar `meal_logs.id` |
| `name` | text | Herkenbare naam, bijvoorbeeld `kipfilet` |
| `amount_g` | numeric(8,2) | Geschatte of handmatig aangepaste hoeveelheid |
| `calories_kcal` | numeric(8,2) | Waarde voor deze portie |
| `protein_g`, `carbs_g`, `fat_g`, `fiber_g` | numeric(8,2) | |
| `micronutrients` | jsonb | Per item alleen als beschikbaar |
| `nutrition_source` | text nullable | `vision_estimate`, `usda`, `manual`, `other` |
| `source_reference` | text nullable | Externe food-ID of modelreferentie |
| `sort_order` | smallint | Weergavevolgorde |
| `created_at`, `updated_at` | timestamptz | |

De som van de items is de bron voor maaltijd- en dagtotalen. Eventuele denormaliseerde totalen op `meal_logs` zijn uitsluitend een cache en moeten opnieuw berekend kunnen worden.

### 3.8 `media_assets`

Metadata voor een foto- of audiobestand. Het bestand zelf staat in object storage, niet in PostgreSQL.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `kind` | text | `meal_photo` of `voice_recording` |
| `storage_key` | text | Geen publiek bestandspad |
| `mime_type` | text | Whitelist bij upload |
| `size_bytes` | bigint | Limiet afdwingen |
| `retention_until` | timestamptz | Automatische verwijderdatum |
| `created_at`, `deleted_at` | timestamptz | |

Standaard: verwijder originele media na verwerking en houd ze niet langer dan nodig voor de gebruikersflow. Een `meal_log` verwijst optioneel naar `media_assets.id`.

### 3.9 `recognition_runs`

Technische en controleerbare registratie van foto-/spraakverwerking. Bewaar geen ruwe modelprompt of onnodige persoonsgegevens in logs.

| Veld | Type | Opmerking |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `media_asset_id` | uuid FK nullable | |
| `mode` | text | `vision` of `speech` |
| `provider`, `model` | text | Provider en modelversie |
| `status` | text | `started`, `succeeded`, `failed`, `needs_review` |
| `result_json` | jsonb nullable | Gevalideerde gestructureerde output, geen blind modelantwoord |
| `error_code` | text nullable | Technische foutcategorie |
| `started_at`, `completed_at` | timestamptz | |

Een run kan nul of één `meal_log` opleveren. Leg die relatie vast met `meal_logs.recognition_run_id` zodat een herverwerking niet meerdere logs automatisch aanmaakt.

## 4. Later uitbreiden

Deze tabellen zijn niet nodig voor de MVP-kern, maar sluiten aan op de productnotities:

- `consent_events`: optioneel auditspoor naast de actuele status in `users`, met gebruiker, doel van verwerking, privacyverklaringversie, keuze, timestamp en bewijs van tekstversie. Geen toestemming overschrijven; elke keuze is een nieuwe rij.
- `weight_measurements`: datum/tijd, gewicht en bron, voor grafieken en doelvoortgang.
- `meal_catalog`: vaste suggestiemaaltijden met macro's; `meal_suggestions` bewaart welke suggesties aan welke gebruiker/dag getoond zijn.
- `subscriptions`: trial- en abonnementsstatus, providerreferentie, start/einddatum en annulering. Sla geen betaalkaartgegevens op.
- `weekly_reports`: gegenereerde coachtekst, periode, modelversie en status. Gebruik alleen geaggregeerde loggegevens.
- `streaks` en `badges`: afgeleide gamificationdata met een unieke sleutel per gebruiker en badge.
- `friendships`, `communities`, `recipes` en `recipe_items`: pas toevoegen wanneer sociale functies daadwerkelijk worden gebouwd.

## 5. Relaties

```text
users 1---n user_profiles
users 1---n goals
users 1---n daily_targets
users 1---n weekly_goals
users 1---n meal_logs 1---n meal_items
users 1---n media_assets 1---n recognition_runs
recognition_runs 0..1---1 meal_logs
goals 1---n daily_targets
goals 1---n weekly_goals
```

## 6. Integriteitsregels

- Foreign keys gebruiken en `user_id` in iedere gebruikersgebonden tabel afdwingen.
- Row-level security of equivalente service-laag toepassen: een gebruiker kan nooit records van een andere gebruiker lezen.
- Enumwaarden valideren bij API en database; vrije tekst niet gebruiken voor statusvelden.
- `consumed_at` en `local_date` samen bepalen de dagweergave; de server berekent `local_date` op basis van de opgeslagen tijdzone.
- Numerieke waarden mogen niet negatief zijn, behalve waar een expliciete correctieflow dat vereist.
- Gebruik transacties voor het bevestigen van een herkenningsresultaat: `meal_log`, alle `meal_items` en de verwijzing naar de recognition-run worden samen aangemaakt.
- Dagtotalen berekenen met `SUM(meal_items...)` over niet-verwijderde logs. Voeg pas later materialized views of caches toe als metingen aantonen dat dit nodig is.

## 7. Privacy, beveiliging en retentie

Voedingsinvoer, gewicht, allergieën en doelen kunnen gezondheidsgegevens zijn. Ontwerp daarom minimaal het volgende:

- Vraag expliciete toestemming vóór het opslaan/verwerken van deze gegevens. Bewaar de actuele opt-in in `users.health_data_consent` en `users.health_data_opted_in_at`; leg iedere wijziging daarnaast vast in `consent_events`.
- Versleutel data tijdens transport en gevoelige profielvelden op applicatieniveau; beperk toegang tot support- en analyticsrollen.
- Gebruik geen maaltijd- of gezondheidsdata voor analytics zonder aparte grondslag en anonimiseer geaggregeerde statistieken.
- Verwijder account, profiel, logs, media en AI-resultaten op verzoek. Houd alleen wettelijk verplichte administratie gescheiden en duidelijk gemotiveerd bij.
- Stel een korte retentie in voor originele foto's/audio en een expliciete retentie voor recognition-runs.
- Log toegang en verwijderacties in een beveiligde auditlog, zonder voedingsinhoud in de logregel.

## 8. Aanbevolen implementatievolgorde

1. Bouw voor de MVP een typed localStorage-schema met `meal_logs`, `meal_items` en één dagelijkse target.
2. Maak PostgreSQL-migraties voor `users` inclusief consentvelden, `user_profiles`, `goals`, `daily_targets`, `weekly_goals`, `meal_logs`, `meal_items`, `media_assets` en `recognition_runs`.
3. Voeg transacties, validatie, indexen en gebruikersisolatie toe vóór cloud-sync live gaat.
4. Blokkeer onboarding-opslag wanneer `health_data_consent` niet expliciet `true` is en test opt-in/intrekking.
5. Voeg `consent_events`, catalogus/suggesties, abonnementen, rapporten en sociale entiteiten alleen toe wanneer de bijbehorende feature wordt gebouwd.

## 9. Open beslissingen vóór migraties

- Welke identity provider wordt gebruikt?
- Worden micronutriënten een vaste kolomset of uitsluitend JSONB? Voor rapportage op vitamines is een aparte `nutrient_values`-tabel op termijn beter.
- Hoe lang mogen AI-resultaten en originele media worden bewaard?
- Wordt een maaltijd direct gelogd na AI-herkenning, of altijd eerst bevestigd? De PRD beschrijft bevestigen via "Log"; dat moet de frontend/backend als contract volgen.
- Welke voedingsdatabron wordt in week 2 de autoritatieve correctielaag: USDA of een andere bron voor Belgische producten?