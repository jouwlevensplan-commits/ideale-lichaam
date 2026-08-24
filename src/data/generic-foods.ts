export interface GenericFood {
  /** Stabiele sleutel, gebruikt als `id`-prefix in zoekresultaten (geen echte database-rij). */
  seedKey: string;
  /** Nederlandstalige naam. */
  name: string;
  /** Franstalige naam. */
  nameFr: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  /** Mock zoek-/logfrequentie voor rangschikking; geen echte gebruiksdata. */
  popularity: number;
}

/**
 * Generieke Belgische/Nederlandse basisproducten (per 100g, rauw/onbereid tenzij vermeld) in beide
 * landstalen. Bewust een statische, in-code lijst in plaats van een database-tabel: dit zijn vaste
 * naslagwaarden die nooit per gebruiker wijzigen, dus ze kosten geen extra databaseverbinding,
 * schrijfactie of geheugen bovenop wat de Node-runtime toch al inlaadt bij het opstarten. Dat is
 * bewust een andere aanpak dan de eerdere pogingen om deze data via `bulkCreate`/`ALTER TABLE` in
 * `meal_catalog` te zetten, die op de 0,1 vCPU / 256MB Northflank-container tot productie-uitval
 * leidden (zie git-geschiedenis: drie deploys, drie reverts). Richtwaarden gebaseerd op standaard
 * voedingswaardetabellen (NEVO/CIQUAL/USDA).
 */
export const GENERIC_FOODS: GenericFood[] = [
  // --- Fruit / Fruits ---
  { seedKey: 'appel', name: 'Appel', nameFr: 'Pomme', calories_kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, popularity: 85 },
  { seedKey: 'banaan', name: 'Banaan', nameFr: 'Banane', calories_kcal: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, fiber_g: 2.6, popularity: 95 },
  { seedKey: 'sinaasappel', name: 'Sinaasappel', nameFr: 'Orange', calories_kcal: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1, fiber_g: 2.4, popularity: 60 },
  { seedKey: 'peer', name: 'Peer', nameFr: 'Poire', calories_kcal: 57, protein_g: 0.4, carbs_g: 15, fat_g: 0.1, fiber_g: 3.1, popularity: 45 },
  { seedKey: 'aardbei', name: 'Aardbei', nameFr: 'Fraise', calories_kcal: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3, fiber_g: 2, popularity: 40 },
  { seedKey: 'druiven', name: 'Druiven', nameFr: 'Raisin', calories_kcal: 69, protein_g: 0.7, carbs_g: 18, fat_g: 0.2, fiber_g: 0.9, popularity: 30 },

  // --- Groenten / Légumes ---
  { seedKey: 'bloemkool', name: 'Bloemkool', nameFr: 'Chou-fleur', calories_kcal: 25, protein_g: 1.9, carbs_g: 5, fat_g: 0.3, fiber_g: 2, popularity: 35 },
  { seedKey: 'broccoli', name: 'Broccoli', nameFr: 'Brocoli', calories_kcal: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, fiber_g: 2.6, popularity: 55 },
  { seedKey: 'witloof', name: 'Witloof', nameFr: 'Chicon', calories_kcal: 17, protein_g: 0.9, carbs_g: 3.8, fat_g: 0.1, fiber_g: 3.1, popularity: 20 },
  { seedKey: 'wortel', name: 'Wortel', nameFr: 'Carotte', calories_kcal: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2, fiber_g: 2.8, popularity: 65 },
  { seedKey: 'prei', name: 'Prei', nameFr: 'Poireau', calories_kcal: 61, protein_g: 1.5, carbs_g: 14, fat_g: 0.3, fiber_g: 1.8, popularity: 25 },
  { seedKey: 'ui', name: 'Ui', nameFr: 'Oignon', calories_kcal: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1, fiber_g: 1.7, popularity: 55 },
  { seedKey: 'tomaat', name: 'Tomaat', nameFr: 'Tomate', calories_kcal: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2, popularity: 80 },
  { seedKey: 'komkommer', name: 'Komkommer', nameFr: 'Concombre', calories_kcal: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, fiber_g: 0.5, popularity: 50 },
  { seedKey: 'spinazie', name: 'Spinazie', nameFr: 'Épinard', calories_kcal: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, fiber_g: 2.2, popularity: 40 },
  { seedKey: 'aardappel', name: 'Aardappel', nameFr: 'Pomme de terre', calories_kcal: 77, protein_g: 2, carbs_g: 17, fat_g: 0.1, fiber_g: 2.2, popularity: 75 },
  { seedKey: 'courgette', name: 'Courgette', nameFr: 'Courgette', calories_kcal: 17, protein_g: 1.2, carbs_g: 3.1, fat_g: 0.3, fiber_g: 1, popularity: 30 },

  // --- Vlees & vis / Viande & poisson ---
  { seedKey: 'kipfilet-rauw', name: 'Kipfilet rauw', nameFr: 'Blanc de poulet cru', calories_kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, popularity: 90 },
  { seedKey: 'rundergehakt-rauw', name: 'Rundergehakt rauw', nameFr: 'Haché de bœuf cru', calories_kcal: 254, protein_g: 17.2, carbs_g: 0, fat_g: 20, fiber_g: 0, popularity: 55 },
  { seedKey: 'varkenshaas-rauw', name: 'Varkenshaas rauw', nameFr: 'Filet mignon de porc cru', calories_kcal: 143, protein_g: 21.5, carbs_g: 0, fat_g: 5.5, fiber_g: 0, popularity: 35 },
  { seedKey: 'kalkoenfilet-rauw', name: 'Kalkoenfilet rauw', nameFr: 'Blanc de dinde cru', calories_kcal: 135, protein_g: 22, carbs_g: 0, fat_g: 4.4, fiber_g: 0, popularity: 25 },
  { seedKey: 'zalm-rauw', name: 'Zalm rauw', nameFr: 'Saumon cru', calories_kcal: 208, protein_g: 20, carbs_g: 0, fat_g: 13, fiber_g: 0, popularity: 45 },
  { seedKey: 'tonijn-blik', name: 'Tonijn in blik (natuurlijk sap)', nameFr: 'Thon en boîte (au naturel)', calories_kcal: 116, protein_g: 26, carbs_g: 0, fat_g: 1, fiber_g: 0, popularity: 30 },

  // --- Zuivel / Produits laitiers ---
  { seedKey: 'ei', name: 'Ei', nameFr: 'Œuf', calories_kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, fiber_g: 0, popularity: 90 },
  { seedKey: 'melk-halfvol', name: 'Melk halfvol', nameFr: 'Lait demi-écrémé', calories_kcal: 46, protein_g: 3.4, carbs_g: 4.8, fat_g: 1.5, fiber_g: 0, popularity: 70 },
  { seedKey: 'yoghurt-vol', name: 'Volle yoghurt natuur', nameFr: 'Yaourt nature entier', calories_kcal: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3, fiber_g: 0, popularity: 40 },
  { seedKey: 'yoghurt-mager', name: 'Magere yoghurt natuur', nameFr: 'Yaourt nature maigre', calories_kcal: 42, protein_g: 4.2, carbs_g: 5.5, fat_g: 0.2, fiber_g: 0, popularity: 45 },
  { seedKey: 'kaas-cheddar', name: 'Cheddar kaas', nameFr: 'Fromage cheddar', calories_kcal: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33, fiber_g: 0, popularity: 35 },
  { seedKey: 'kaas-emmentaler', name: 'Emmentaler kaas', nameFr: 'Fromage emmental', calories_kcal: 380, protein_g: 28, carbs_g: 0, fat_g: 29, fiber_g: 0, popularity: 30 },
  { seedKey: 'boter', name: 'Boter', nameFr: 'Beurre', calories_kcal: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81, fiber_g: 0, popularity: 50 },

  // --- Granen / Céréales ---
  { seedKey: 'rijst-gekookt', name: 'Rijst (gekookt)', nameFr: 'Riz cuit', calories_kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, popularity: 85 },
  { seedKey: 'volkorenbrood', name: 'Volkorenbrood', nameFr: 'Pain complet', calories_kcal: 235, protein_g: 9, carbs_g: 41, fat_g: 2.5, fiber_g: 7, popularity: 80 },
  { seedKey: 'witbrood', name: 'Witbrood', nameFr: 'Pain blanc', calories_kcal: 265, protein_g: 9, carbs_g: 49, fat_g: 3.2, fiber_g: 2.7, popularity: 60 },
  { seedKey: 'havermout', name: 'Havermout', nameFr: "Flocons d'avoine", calories_kcal: 379, protein_g: 13.5, carbs_g: 67, fat_g: 6.5, fiber_g: 10, popularity: 50 },
  { seedKey: 'pasta-gekookt', name: 'Pasta (gekookt)', nameFr: 'Pâtes cuites', calories_kcal: 131, protein_g: 5, carbs_g: 25, fat_g: 1.1, fiber_g: 1.8, popularity: 70 },
  { seedKey: 'quinoa-gekookt', name: 'Quinoa (gekookt)', nameFr: 'Quinoa cuit', calories_kcal: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9, fiber_g: 2.8, popularity: 25 },
  { seedKey: 'couscous-gekookt', name: 'Couscous (gekookt)', nameFr: 'Couscous cuit', calories_kcal: 112, protein_g: 3.8, carbs_g: 23, fat_g: 0.2, fiber_g: 1.4, popularity: 20 },
];
