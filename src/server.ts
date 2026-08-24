import express from 'express';

import { connectDatabase } from './db/client';
import { syncDatabase } from './db/models';
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

  // De HTTP-server start altijd, ongeacht of de databasestappen hieronder lukken: GET /health mag
  // nooit afhankelijk zijn van Postgres, en een mislukte sync/seed mag de container nooit laten
  // crashen (drie eerdere productie-uitvallen op de 0,1 vCPU / 256MB Northflank-container kwamen
  // stuk voor stuk uit deze boot-keten — zie git-geschiedenis). API-routes die wél een database
  // nodig hebben falen dan gewoon per request met een 500, in plaats van de hele server plat te
  // leggen.
  app.listen(PORT, () => {
    console.log(`Server luistert op poort ${PORT}`);
  });

  // De PostgreSQL-tabellen worden op de achtergrond aangemaakt/gesynchroniseerd (databaseplan §8)
  // en van seed-data voorzien; dit blokkeert het luisteren op `PORT` bewust niet meer.
  connectDatabase()
    .then(() => syncDatabase())
    .then(() => runSeeds())
    .then(() => {
      console.log('Databaseverbinding gelegd, tabellen gesynchroniseerd en seed-data toegepast.');
    })
    .catch((error) => {
      console.error('Databaseverbinding, -synchronisatie of seed is mislukt; server blijft draaien.', error);
    });
}
