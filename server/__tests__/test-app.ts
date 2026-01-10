import express from "express";
import { registerRoutes } from "../routes";
import { createServer } from "http";

export async function createTestApp() {
  const app = express();
  const httpServer = createServer(app);
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  app.get('/health/db', async (_req, res) => {
    try {
      const { pool } = await import('../db');
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'DB_UNAVAILABLE', message: 'Database connection failed' });
    }
  });
  
  await registerRoutes(httpServer, app);
  
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  
  return { app, httpServer };
}
