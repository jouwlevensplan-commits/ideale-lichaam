import express from 'express';

const PORT = Number(process.env.PORT) || 3000;

export function createServer() {
  const app = express();

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP' });
  });

  return app;
}

if (require.main === module) {
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`Server luistert op poort ${PORT}`);
  });
}
