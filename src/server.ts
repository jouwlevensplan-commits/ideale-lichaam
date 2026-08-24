import express from 'express';

import { connectDatabase } from './db/client';
import { syncDatabase } from './db/models';
import { runMigrations } from './db/migrations';
import { runSeeds } from './db/seeds';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

const PORT = Number(process.env.PORT) || 3000;

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createServer();

  // De PostgreSQL-tabellen worden bij het opstarten aangemaakt/gesynchroniseerd (databaseplan §8),
  // vóór de server verkeer aanneemt op de API-routes die ze nodig hebben.
  connectDatabase()
    .then(() => syncDatabase())
    .then(() => runMigrations())
    .then(() => runSeeds())
    .then(() => {
      console.log('Databaseverbinding gelegd, tabellen gesynchroniseerd, migraties en seed-data toegepast.');
      app.listen(PORT, () => {
        console.log(`Server luistert op poort ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Kon niet opstarten: databaseverbinding, -synchronisatie, migratie of seed is mislukt.', error);
      process.exit(1);
    });
}
