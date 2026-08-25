import { DataTypes } from 'sequelize';

import { sequelize } from '../models';

/**
 * `sequelize.sync()` (db/models/index.ts) maakt bewust alleen ontbrekende tabellen aan — het
 * wijzigt nooit een tabel die al bestaat, om nooit destructief te zijn bij het opstarten. Voor
 * `users`, dat al vóór de e-mail/wachtwoord-authenticatie in productie stond, moet de nieuwe
 * `password_hash`-kolom daarom hier expliciet worden toegevoegd.
 *
 * `describeTable` controleert eerst of de kolom al bestaat; `addColumn` draait alleen als ze
 * ontbreekt. Op een al-gemigreerde database (inclusief een verse installatie, waar `sync()` de
 * kolom al meteen aanmaakt) doet deze functie dus niets. Dit is bewust een klein, op zichzelf
 * staand `ALTER TABLE` van één nullable kolom — geen bulk-seeddata erbij — en wordt vanuit
 * `server.ts` op de achtergrond aangeroepen, ná `app.listen()`: een mislukking hier logt alleen en
 * kan de server niet meer laten crashen (zie de git-geschiedenis van `belgische-database-strategie.md`
 * voor waarom dat onderscheid hier expliciet bewaakt wordt).
 */
export async function runMigrations(): Promise<void> {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('users');

    if (!columns.password_hash) {
      await queryInterface.addColumn('users', 'password_hash', { type: DataTypes.STRING, allowNull: true });
    }
  } catch (error) {
    console.warn('Kon users niet uitbreiden met password_hash.', error);
  }
}
